import "reflect-metadata";
import { afterAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { RabbitConsumer, RabbitSubscribe } from "@/messaging/decorators";
import { RabbitMQService } from "@/messaging/rabbitmq.service";
import { RabbitMQModule } from "@/messaging/rabbitmq-module";
import type { RetryOptions } from "@/messaging/retry";
import { retryDelays, retryQueueName } from "@/messaging/topology";
import type { RabbitMessage } from "@/messaging/types";

const URI = process.env.RABBITMQ_URI ?? "amqp://guest:guest@localhost:5672";

async function brokerReachable(): Promise<boolean> {
	try {
		const amqp = await import("amqplib");
		const conn = await amqp.connect(URI);
		await conn.close();
		return true;
	} catch {
		return false;
	}
}

const reachable = await brokerReachable();
const createdQueues = new Set<string>();

/**
 * Registers the queue and every retry queue the module derives from `retry`,
 * so `afterAll` can delete the whole set instead of leaking parking queues.
 */
function uniqueQueue(prefix: string, retry?: RetryOptions): string {
	const name = `bunstone.${prefix}.${crypto.randomUUID().slice(0, 8)}`;
	createdQueues.add(name);
	for (const delay of retryDelays(retry)) {
		createdQueues.add(retryQueueName(name, delay));
	}
	return name;
}

afterAll(async () => {
	if (!reachable) return;
	const amqp = await import("amqplib");
	const connection = await amqp.connect(URI);
	const channel = await connection.createChannel();
	for (const queue of createdQueues) {
		try {
			await channel.deleteQueue(queue);
		} catch {}
	}
	await connection.close();
});

async function messageCount(queue: string): Promise<number> {
	const amqp = await import("amqplib");
	const connection = await amqp.connect(URI);
	const channel = await connection.createChannel();
	try {
		const info = await channel.checkQueue(queue);
		return info.messageCount;
	} finally {
		await connection.close();
	}
}

describe.skipIf(!reachable)("RabbitMQ durability", () => {
	it("resumes a retry that was in flight when the process died", async () => {
		const delay = 3000;
		const retry = { maxAttempts: 3, baseDelayMs: delay, factor: 1 };
		const queue = uniqueQueue("restart", retry);

		const firstAttempts: number[] = [];
		let sawFirstFailure!: () => void;
		const firstFailure = new Promise<void>((r) => {
			sawFirstFailure = r;
		});

		@RabbitConsumer()
		@Injectable()
		class FailingConsumer {
			@RabbitSubscribe({ queue })
			async onMessage(message: RabbitMessage<{ id: number }>) {
				firstAttempts.push(message.attempt);
				sawFirstFailure();
				throw new Error("downstream is down");
			}
		}

		@Module({
			imports: [
				RabbitMQModule.register({
					uri: URI,
					queues: [{ name: queue }],
					retry,
				}),
			],
			providers: [FailingConsumer],
		})
		class FirstBoot {}

		const first = await Application.create(FirstBoot, {
			gracefulShutdown: false,
			logStartup: false,
		});

		await first.resolve(RabbitMQService).sendToQueue(queue, { id: 7 });
		await Promise.race([firstFailure, timeout(5000)]);
		expect(firstAttempts).toEqual([1]);

		// kill the app while the retry is still parked on the broker
		await first.close();
		expect(await messageCount(retryQueueName(queue, delay))).toBe(1);

		const secondAttempts: number[] = [];
		let sawSuccess!: () => void;
		const success = new Promise<void>((r) => {
			sawSuccess = r;
		});

		@RabbitConsumer()
		@Injectable()
		class RecoveredConsumer {
			@RabbitSubscribe({ queue })
			async onMessage(message: RabbitMessage<{ id: number }>) {
				secondAttempts.push(message.attempt);
				sawSuccess();
			}
		}

		@Module({
			imports: [
				RabbitMQModule.register({
					uri: URI,
					queues: [{ name: queue }],
					retry,
				}),
			],
			providers: [RecoveredConsumer],
		})
		class SecondBoot {}

		const second = await Application.create(SecondBoot, {
			gracefulShutdown: false,
			logStartup: false,
		});

		// the TTL expires and the broker returns the message on its own
		await Promise.race([success, timeout(10_000)]);
		await second.close();

		expect(secondAttempts).toEqual([2]);
	}, 30_000);

	it("pauses consumption instead of draining the queue into the DLQ", async () => {
		const retry = { maxAttempts: 5, baseDelayMs: 50, factor: 1 };
		const queue = uniqueQueue("breaker", retry);
		const dlq = uniqueQueue("breaker.dlq");

		let handled = 0;
		let sawFailure!: () => void;
		const failed = new Promise<void>((r) => {
			sawFailure = r;
		});

		@RabbitConsumer()
		@Injectable()
		class BrokenConsumer {
			@RabbitSubscribe({ queue })
			async onMessage() {
				handled++;
				sawFailure();
				throw new Error("downstream is down");
			}
		}

		@Module({
			imports: [
				RabbitMQModule.register({
					uri: URI,
					prefetch: 1,
					queues: [{ name: queue, deadLetterQueue: dlq }, { name: dlq }],
					retry,
					circuitBreaker: { failureThreshold: 1, cooldownMs: 60_000 },
				}),
			],
			providers: [BrokenConsumer],
		})
		class BreakerApp {}

		const app = await Application.create(BreakerApp, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const rabbit = app.resolve(RabbitMQService);

		for (const id of [1, 2, 3]) {
			await rabbit.sendToQueue(queue, { id });
		}

		await Promise.race([failed, timeout(5000)]);
		await Bun.sleep(1500);
		await app.close();

		// one failure opened the circuit; the other two were never delivered
		expect(handled).toBe(1);
		expect(await messageCount(dlq)).toBe(0);
		// two undelivered, plus the failed one already back from its retry queue
		expect(await messageCount(queue)).toBe(3);
	}, 30_000);

	it("lets an in-flight handler finish before shutdown completes", async () => {
		const queue = uniqueQueue("drain");

		let finished = false;
		let sawStart!: () => void;
		const started = new Promise<void>((r) => {
			sawStart = r;
		});

		@RabbitConsumer()
		@Injectable()
		class SlowConsumer {
			@RabbitSubscribe({ queue })
			async onMessage() {
				sawStart();
				await Bun.sleep(500);
				finished = true;
			}
		}

		@Module({
			imports: [
				RabbitMQModule.register({ uri: URI, queues: [{ name: queue }] }),
			],
			providers: [SlowConsumer],
		})
		class DrainApp {}

		const app = await Application.create(DrainApp, {
			gracefulShutdown: false,
			logStartup: false,
		});

		await app.resolve(RabbitMQService).sendToQueue(queue, { id: 1 });
		await Promise.race([started, timeout(5000)]);
		await app.close();

		expect(finished).toBe(true);
		expect(await messageCount(queue)).toBe(0);
	}, 30_000);
});

function timeout(ms: number): Promise<void> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error("timeout")), ms),
	);
}
