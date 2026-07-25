import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import { QueueConsumer } from "@/messaging/consumer";
import { retryQueueName } from "@/messaging/topology";
import type { RabbitMessage } from "@/messaging/types";

interface Published {
	queue: string;
	content: string;
	headers: Record<string, unknown>;
}

/**
 * Minimal stand-in for an amqplib confirm channel. `deliver` plays the role of
 * the broker pushing a message, so the ack/nack decisions can be asserted
 * without a running RabbitMQ.
 */
class FakeChannel {
	readonly published: Published[] = [];
	readonly acked: ConsumeMessage[] = [];
	readonly nacked: { message: ConsumeMessage; requeue: boolean }[] = [];
	readonly declared: { queue: string; options?: unknown }[] = [];
	cancelled = 0;
	/** When set, every publish fails with this error. */
	publishError?: Error;

	private handler?: (message: ConsumeMessage | null) => void;
	private tag = 0;

	async assertQueue(queue: string, options?: unknown) {
		this.declared.push({ queue, options });
		return { queue, messageCount: 0, consumerCount: 0 };
	}

	async prefetch() {}

	async consume(
		_queue: string,
		handler: (message: ConsumeMessage | null) => void,
	) {
		this.handler = handler;
		this.tag++;
		return { consumerTag: `tag-${this.tag}` };
	}

	async cancel() {
		this.cancelled++;
		this.handler = undefined;
	}

	ack(message: ConsumeMessage) {
		this.acked.push(message);
	}

	nack(message: ConsumeMessage, _allUpTo: boolean, requeue: boolean) {
		this.nacked.push({ message, requeue });
	}

	sendToQueue(
		queue: string,
		content: Buffer,
		options: { headers?: Record<string, unknown> },
		callback: (error: Error | null) => void,
	): boolean {
		if (this.publishError) {
			callback(this.publishError);
			return true;
		}
		this.published.push({
			queue,
			content: content.toString(),
			headers: options.headers ?? {},
		});
		callback(null);
		return true;
	}

	deliver(
		body: unknown,
		headers: Record<string, unknown> = {},
	): ConsumeMessage {
		const message = {
			content: Buffer.from(JSON.stringify(body)),
			fields: { deliveryTag: 1, redelivered: false, routingKey: "q" },
			properties: { headers, messageId: "m-1", correlationId: "c-1" },
		} as unknown as ConsumeMessage;
		this.handler?.(message);
		return message;
	}

	get isConsuming(): boolean {
		return Boolean(this.handler);
	}

	asChannel(): ConfirmChannel {
		return this as unknown as ConfirmChannel;
	}
}

const RETRY = { maxAttempts: 3, baseDelayMs: 100, factor: 2 };

async function setup(overrides: {
	handle: (message: RabbitMessage) => Promise<void>;
	deadLetterQueue?: string;
	failureThreshold?: number;
}) {
	const channel = new FakeChannel();
	const consumer = new QueueConsumer({
		queue: "orders",
		handle: overrides.handle,
		retry: RETRY,
		deadLetterQueue: overrides.deadLetterQueue,
		breaker: overrides.failureThreshold
			? { failureThreshold: overrides.failureThreshold, cooldownMs: 60_000 }
			: undefined,
	});
	await consumer.attach(channel.asChannel());
	return { channel, consumer };
}

describe("QueueConsumer", () => {
	it("declares a parking queue for every backoff step", async () => {
		const { channel } = await setup({ handle: async () => {} });

		const names = channel.declared.map((entry) => entry.queue);
		expect(names).toContain(retryQueueName("orders", 100));
		expect(names).toContain(retryQueueName("orders", 200));
	});

	it("acks a message whose handler resolves", async () => {
		const { channel, consumer } = await setup({ handle: async () => {} });

		channel.deliver({ id: 1 });
		await consumer.drain(1000);

		expect(channel.acked).toHaveLength(1);
		expect(channel.published).toHaveLength(0);
	});

	it("parks a failed message in the retry queue before acking it", async () => {
		const { channel, consumer } = await setup({
			handle: async () => {
				throw new Error("boom");
			},
		});

		channel.deliver({ id: 1 });
		await consumer.drain(1000);

		expect(channel.published).toHaveLength(1);
		expect(channel.published[0]?.queue).toBe(retryQueueName("orders", 100));
		expect(channel.published[0]?.headers["x-attempt"]).toBe(2);
		// the original is only released once the copy is confirmed
		expect(channel.acked).toHaveLength(1);
	});

	it("routes to the DLQ once attempts are exhausted", async () => {
		const { channel, consumer } = await setup({
			handle: async () => {
				throw new Error("boom");
			},
			deadLetterQueue: "orders.dlq",
		});

		channel.deliver({ id: 1 }, { "x-attempt": 3 });
		await consumer.drain(1000);

		expect(channel.published[0]?.queue).toBe("orders.dlq");
		expect(channel.published[0]?.headers["x-error"]).toContain("boom");
	});

	it("keeps the message on the queue when the retry publish fails", async () => {
		const { channel, consumer } = await setup({
			handle: async () => {
				throw new Error("boom");
			},
		});
		channel.publishError = new Error("broker refused");

		channel.deliver({ id: 1 });
		await consumer.drain(1000);

		expect(channel.acked).toHaveLength(0);
		expect(channel.nacked).toEqual([
			{ message: expect.anything(), requeue: true },
		]);
	});

	it("pauses consumption instead of spending attempts once the circuit opens", async () => {
		let calls = 0;
		const { channel, consumer } = await setup({
			handle: async () => {
				calls++;
				throw new Error("boom");
			},
			deadLetterQueue: "orders.dlq",
			failureThreshold: 1,
		});

		channel.deliver({ id: 1 });
		await consumer.drain(1000);

		expect(calls).toBe(1);
		expect(channel.cancelled).toBe(1);
		expect(channel.isConsuming).toBe(false);
		// nothing was dead-lettered; only the first message moved to a retry queue
		expect(channel.published.map((p) => p.queue)).toEqual([
			retryQueueName("orders", 100),
		]);
	});

	it("requeues without spending an attempt while the circuit is open", async () => {
		const { channel, consumer } = await setup({
			handle: async () => {
				throw new Error("boom");
			},
			failureThreshold: 1,
		});

		channel.deliver({ id: 1 });
		await consumer.drain(1000);
		const publishedAfterFirst = channel.published.length;

		// the breaker is open now; re-attach so a second delivery can arrive
		await consumer.attach(channel.asChannel());
		channel.deliver({ id: 2 });
		await consumer.drain(1000);

		expect(channel.published).toHaveLength(publishedAfterFirst);
		expect(channel.nacked.at(-1)?.requeue).toBe(true);
	});

	it("treats a corrupted attempt header as the first attempt", async () => {
		const seen: number[] = [];
		const { channel, consumer } = await setup({
			handle: async (message) => {
				seen.push(message.attempt);
			},
		});

		channel.deliver({ id: 1 }, { "x-attempt": "not-a-number" });
		await consumer.drain(1000);

		expect(seen).toEqual([1]);
	});

	it("stops delivering and waits for in-flight work on close", async () => {
		let finished = false;
		const { channel, consumer } = await setup({
			handle: async () => {
				await Bun.sleep(50);
				finished = true;
			},
		});

		channel.deliver({ id: 1 });
		await consumer.close(1000);

		expect(finished).toBe(true);
		expect(channel.cancelled).toBe(1);
	});
});
