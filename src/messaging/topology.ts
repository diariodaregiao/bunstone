import type { Channel } from "amqplib";
import { backoffDelay, type RetryOptions, shouldRetry } from "./retry";
import type { RabbitExchangeConfig, RabbitQueueConfig } from "./types";

export interface TopologyOptions {
	exchanges?: RabbitExchangeConfig[];
	queues?: RabbitQueueConfig[];
}

/**
 * Queue that parks a message until its TTL expires and the broker
 * dead-letters it back into the queue it came from.
 */
export function retryQueueName(queue: string, delayMs: number): string {
	return `${queue}.retry.${delayMs}ms`;
}

/**
 * Backoff delays a message can go through, one per attempt that is still
 * allowed to retry. Equal delays collapse into a single queue, so a capped
 * `maxDelayMs` does not create one queue per attempt.
 */
export function retryDelays(retry: RetryOptions | undefined): number[] {
	const delays: number[] = [];
	for (let attempt = 1; shouldRetry(attempt, retry); attempt++) {
		const delay = backoffDelay(attempt, retry);
		if (!delays.includes(delay)) delays.push(delay);
	}
	return delays;
}

/**
 * Points the queue at its dead-letter queue through the default exchange, so
 * rejections the broker itself decides — a queue TTL, a `max-length` overflow,
 * a `nack` without requeue — land in the DLQ instead of disappearing.
 */
function deadLetterArguments(deadLetterQueue: string | undefined): {
	arguments?: Record<string, unknown>;
} {
	if (!deadLetterQueue) return {};
	return {
		arguments: {
			"x-dead-letter-exchange": "",
			"x-dead-letter-routing-key": deadLetterQueue,
		},
	};
}

export async function declareTopology(
	channel: Channel,
	options: TopologyOptions,
): Promise<void> {
	for (const exchange of options.exchanges ?? []) {
		await channel.assertExchange(exchange.name, exchange.type ?? "topic", {
			durable: exchange.durable ?? true,
		});
	}
	for (const queue of options.queues ?? []) {
		// the dead-letter target has to exist before the queue that points at it
		if (queue.deadLetterQueue) {
			await channel.assertQueue(queue.deadLetterQueue, { durable: true });
		}
		await channel.assertQueue(queue.name, {
			durable: queue.durable ?? true,
			...deadLetterArguments(queue.deadLetterQueue),
		});
		for (const binding of queue.bindings ?? []) {
			await channel.bindQueue(queue.name, binding.exchange, binding.routingKey);
		}
	}
}

/**
 * Declares one parking queue per distinct backoff delay. Each expires its
 * messages straight back into `queue` through the default exchange, so a
 * retry in flight is broker state and survives a process restart.
 */
export async function declareRetryTopology(
	channel: Channel,
	queue: string,
	retry: RetryOptions | undefined,
): Promise<void> {
	for (const delay of retryDelays(retry)) {
		await channel.assertQueue(retryQueueName(queue, delay), {
			durable: true,
			arguments: {
				"x-message-ttl": delay,
				"x-dead-letter-exchange": "",
				"x-dead-letter-routing-key": queue,
			},
		});
	}
}
