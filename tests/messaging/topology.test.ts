import { describe, expect, it } from "bun:test";
import type { Channel } from "amqplib";
import {
	declareRetryTopology,
	declareTopology,
	retryDelays,
	retryQueueName,
} from "@/messaging/topology";

interface Declared {
	queue: string;
	options?: { durable?: boolean; arguments?: Record<string, unknown> };
}

class FakeChannel {
	readonly declared: Declared[] = [];
	readonly exchanges: string[] = [];
	readonly bindings: string[] = [];

	async assertQueue(queue: string, options?: Declared["options"]) {
		this.declared.push({ queue, options });
		return { queue, messageCount: 0, consumerCount: 0 };
	}

	async assertExchange(name: string) {
		this.exchanges.push(name);
		return { exchange: name };
	}

	async bindQueue(queue: string, exchange: string, routingKey: string) {
		this.bindings.push(`${exchange}:${routingKey}->${queue}`);
		return {};
	}

	find(queue: string): Declared | undefined {
		return this.declared.find((entry) => entry.queue === queue);
	}

	asChannel(): Channel {
		return this as unknown as Channel;
	}
}

describe("retryDelays", () => {
	it("produces one delay per retryable attempt", () => {
		expect(
			retryDelays({ maxAttempts: 3, baseDelayMs: 200, factor: 2 }),
		).toEqual([200, 400]);
	});

	it("is empty when retries are disabled", () => {
		expect(retryDelays({ maxAttempts: 1 })).toEqual([]);
	});

	it("collapses delays that hit the ceiling into one queue", () => {
		expect(
			retryDelays({
				maxAttempts: 5,
				baseDelayMs: 1000,
				factor: 10,
				maxDelayMs: 5000,
			}),
		).toEqual([1000, 5000]);
	});

	it("falls back to the defaults", () => {
		expect(retryDelays(undefined)).toEqual([200, 400]);
	});
});

describe("retryQueueName", () => {
	it("derives a name from the queue and delay", () => {
		expect(retryQueueName("orders.created", 400)).toBe(
			"orders.created.retry.400ms",
		);
	});
});

describe("declareTopology", () => {
	it("points a queue at its dead-letter queue", async () => {
		const channel = new FakeChannel();

		await declareTopology(channel.asChannel(), {
			queues: [{ name: "orders", deadLetterQueue: "orders.dlq" }],
		});

		expect(channel.find("orders")?.options?.arguments).toEqual({
			"x-dead-letter-exchange": "",
			"x-dead-letter-routing-key": "orders.dlq",
		});
	});

	it("declares the dead-letter queue before the queue that targets it", async () => {
		const channel = new FakeChannel();

		await declareTopology(channel.asChannel(), {
			queues: [{ name: "orders", deadLetterQueue: "orders.dlq" }],
		});

		const names = channel.declared.map((entry) => entry.queue);
		expect(names.indexOf("orders.dlq")).toBeLessThan(names.indexOf("orders"));
	});

	it("leaves a queue without a DLQ unchanged", async () => {
		const channel = new FakeChannel();

		await declareTopology(channel.asChannel(), {
			queues: [{ name: "orders", durable: false }],
		});

		expect(channel.find("orders")?.options).toEqual({ durable: false });
	});

	it("declares exchanges and bindings", async () => {
		const channel = new FakeChannel();

		await declareTopology(channel.asChannel(), {
			exchanges: [{ name: "events" }],
			queues: [
				{
					name: "orders",
					bindings: [{ exchange: "events", routingKey: "orders.created" }],
				},
			],
		});

		expect(channel.exchanges).toEqual(["events"]);
		expect(channel.bindings).toEqual(["events:orders.created->orders"]);
	});
});

describe("declareRetryTopology", () => {
	it("parks messages on a TTL and routes them back to the source queue", async () => {
		const channel = new FakeChannel();

		await declareRetryTopology(channel.asChannel(), "orders", {
			maxAttempts: 2,
			baseDelayMs: 250,
		});

		expect(channel.find("orders.retry.250ms")?.options).toEqual({
			durable: true,
			arguments: {
				"x-message-ttl": 250,
				"x-dead-letter-exchange": "",
				"x-dead-letter-routing-key": "orders",
			},
		});
	});

	it("declares nothing when retries are disabled", async () => {
		const channel = new FakeChannel();

		await declareRetryTopology(channel.asChannel(), "orders", {
			maxAttempts: 1,
		});

		expect(channel.declared).toEqual([]);
	});
});
