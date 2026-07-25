import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { RabbitConsumer, RabbitSubscribe } from "@/messaging/decorators";
import { RabbitMQService } from "@/messaging/rabbitmq.service";
import { RabbitMQModule } from "@/messaging/rabbitmq-module";
import { retryDelays, retryQueueName } from "@/messaging/topology";
import type { RabbitMessage } from "@/messaging/types";
import { rabbitReachable, RABBITMQ_URI as URI } from "../support/services";

const CONTAINER = process.env.RABBITMQ_CONTAINER;

const canRun =
	process.env.RABBITMQ_CHAOS === "1" &&
	Boolean(CONTAINER) &&
	(await rabbitReachable(URI));
const QUEUE = `bunstone.reconnect.${crypto.randomUUID().slice(0, 8)}`;
const received: number[] = [];

@RabbitConsumer()
@Injectable()
class ReconnectConsumer {
	@RabbitSubscribe({ queue: QUEUE })
	async onMessage(message: RabbitMessage<{ id: number }>) {
		received.push(message.data.id);
	}
}

@Module({
	imports: [
		RabbitMQModule.register({
			uri: URI,
			reconnect: { delayMs: 500 },
			queues: [{ name: QUEUE }],
		}),
	],
	providers: [ReconnectConsumer],
})
class AppModule {}

let app: Application;

beforeAll(async () => {
	if (!canRun) return;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
});

afterAll(async () => {
	if (!canRun) return;
	await app.close();
	const amqp = await import("amqplib");
	const connection = await amqp.connect(URI);
	const channel = await connection.createChannel();
	for (const queue of [
		QUEUE,
		...retryDelays(undefined).map((delay) => retryQueueName(QUEUE, delay)),
	]) {
		try {
			await channel.deleteQueue(queue);
		} catch {}
	}
	await connection.close();
});

async function waitFor(id: number, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (received.includes(id)) return;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`message ${id} not received within ${timeoutMs}ms`);
}

describe.skipIf(!canRun)("RabbitMQ reconnection", () => {
	it("re-registers consumers after the broker restarts", async () => {
		const rabbit = app.resolve(RabbitMQService);

		await rabbit.sendToQueue(QUEUE, { id: 1 });
		await waitFor(1, 4000);

		const restart = Bun.spawn(["docker", "restart", CONTAINER as string], {
			stdout: "ignore",
			stderr: "ignore",
		});
		expect(await restart.exited).toBe(0);

		await rabbit.sendToQueue(QUEUE, { id: 2 });
		await waitFor(2, 25000);

		expect(received).toContain(1);
		expect(received).toContain(2);
	}, 40000);
});
