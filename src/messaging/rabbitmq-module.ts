import type { Channel, ConsumeMessage } from "amqplib";
import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { InjectionToken } from "@/core/injectable";
import type { DynamicModule } from "@/core/module";
import { Logger } from "@/utils/logger";
import { CircuitBreaker } from "./circuit-breaker";
import { RabbitConnection, type RabbitConnectionOptions } from "./connection";
import { getSubscriptions } from "./decorators";
import { RabbitMQService } from "./rabbitmq.service";
import { backoffDelay, type RetryOptions, shouldRetry } from "./retry";
import type {
	RabbitExchangeConfig,
	RabbitMessage,
	RabbitQueueConfig,
} from "./types";

export interface RabbitMQModuleOptions extends RabbitConnectionOptions {
	exchanges?: RabbitExchangeConfig[];
	queues?: RabbitQueueConfig[];
	retry?: RetryOptions;
}

export const RABBIT_OPTIONS = new InjectionToken<RabbitMQModuleOptions>(
	"RabbitMQOptions",
);

export class RabbitMQModule {
	static register(options: RabbitMQModuleOptions): DynamicModule {
		return {
			module: RabbitMQModule,
			global: true,
			providers: [
				{ provide: RABBIT_OPTIONS, useValue: options },
				{
					provide: RabbitConnection,
					useFactory: (opts: RabbitMQModuleOptions) =>
						new RabbitConnection(opts),
					inject: [RABBIT_OPTIONS],
				},
				RabbitMQService,
			],
		};
	}
}

const logger = new Logger("Rabbit");

export async function wireRabbit(
	container: Container,
	instances: readonly unknown[],
): Promise<void> {
	if (!container.has(RabbitConnection)) return;

	const connection = container.resolve(RabbitConnection);
	const options = container.resolve<RabbitMQModuleOptions>(RABBIT_OPTIONS);
	const deadLetters = buildDeadLetterMap(options.queues ?? []);

	connection.registerSetup((channel) => declareTopology(channel, options));

	for (const instance of instances) {
		const ctor = (instance as { constructor?: Constructor })?.constructor;
		if (typeof ctor !== "function") continue;
		const target = instance as Record<
			string,
			((message: RabbitMessage) => Promise<void>) | undefined
		>;
		for (const sub of getSubscriptions(ctor)) {
			const method = target[sub.methodName];
			if (typeof method !== "function") continue;
			const handle = (message: RabbitMessage) => method.call(target, message);
			const breaker = new CircuitBreaker();
			connection.registerSetup((channel) =>
				consumeQueue(
					channel,
					sub.queue,
					deadLetters,
					options.retry,
					breaker,
					handle,
				),
			);
		}
	}

	await connection.start();
}

async function declareTopology(
	channel: Channel,
	options: RabbitMQModuleOptions,
): Promise<void> {
	for (const exchange of options.exchanges ?? []) {
		await channel.assertExchange(exchange.name, exchange.type ?? "topic", {
			durable: exchange.durable ?? true,
		});
	}
	for (const queue of options.queues ?? []) {
		await channel.assertQueue(queue.name, { durable: queue.durable ?? true });
		for (const binding of queue.bindings ?? []) {
			await channel.bindQueue(queue.name, binding.exchange, binding.routingKey);
		}
		if (queue.deadLetterQueue) {
			await channel.assertQueue(queue.deadLetterQueue, { durable: true });
		}
	}
}

async function consumeQueue(
	channel: Channel,
	queue: string,
	deadLetters: Map<string, string>,
	retry: RetryOptions | undefined,
	breaker: CircuitBreaker,
	handle: (message: RabbitMessage) => Promise<void>,
): Promise<void> {
	await channel.assertQueue(queue, { durable: true });
	await channel.consume(queue, async (raw) => {
		if (!raw) return;
		const attempt = Number(raw.properties.headers?.["x-attempt"] ?? 1);
		const message: RabbitMessage = { data: decode(raw), raw, attempt };

		try {
			await breaker.execute(() => handle(message));
			channel.ack(raw);
		} catch (error) {
			channel.ack(raw);
			handleFailure(channel, queue, raw, attempt, retry, deadLetters, error);
		}
	});
}

function handleFailure(
	channel: Channel,
	queue: string,
	raw: ConsumeMessage,
	attempt: number,
	retry: RetryOptions | undefined,
	deadLetters: Map<string, string>,
	error: unknown,
): void {
	if (shouldRetry(attempt, retry)) {
		const timer = setTimeout(
			() => {
				try {
					channel.sendToQueue(queue, raw.content, {
						persistent: true,
						headers: { "x-attempt": attempt + 1 },
					});
				} catch {
					logger.warn(`Could not requeue message for "${queue}".`);
				}
			},
			backoffDelay(attempt, retry),
		);
		timer.unref?.();
		return;
	}

	const dlq = deadLetters.get(queue);
	if (dlq) {
		try {
			channel.sendToQueue(dlq, raw.content, {
				persistent: true,
				headers: { "x-attempt": attempt, "x-error": String(error) },
			});
		} catch {
			logger.warn(`Could not route message to DLQ "${dlq}".`);
		}
	} else {
		logger.error(
			`Message on "${queue}" failed after ${attempt} attempts and no DLQ is configured.`,
		);
	}
}

function buildDeadLetterMap(queues: RabbitQueueConfig[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const queue of queues) {
		if (queue.deadLetterQueue) map.set(queue.name, queue.deadLetterQueue);
	}
	return map;
}

function decode(raw: ConsumeMessage): unknown {
	try {
		return JSON.parse(raw.content.toString());
	} catch {
		return raw.content.toString();
	}
}
