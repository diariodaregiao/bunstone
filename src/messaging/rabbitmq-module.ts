import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { InjectionToken } from "@/core/injectable";
import type { DynamicModule } from "@/core/module";
import type { CircuitBreakerOptions } from "./circuit-breaker";
import { RabbitConnection, type RabbitConnectionOptions } from "./connection";
import { QueueConsumer } from "./consumer";
import { getSubscriptions } from "./decorators";
import { RabbitMQService } from "./rabbitmq.service";
import type { RetryOptions } from "./retry";
import { declareTopology } from "./topology";
import type {
	RabbitExchangeConfig,
	RabbitMessage,
	RabbitQueueConfig,
} from "./types";

export interface RabbitMQModuleOptions extends RabbitConnectionOptions {
	exchanges?: RabbitExchangeConfig[];
	queues?: RabbitQueueConfig[];
	retry?: RetryOptions;
	circuitBreaker?: CircuitBreakerOptions;
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
			exports: [RABBIT_OPTIONS, RabbitConnection, RabbitMQService],
		};
	}
}

export async function wireRabbit(
	container: Container,
	instances: readonly unknown[],
): Promise<void> {
	if (!container.has(RabbitConnection)) return;

	const connection = container.resolve(RabbitConnection);
	const options = container.resolve<RabbitMQModuleOptions>(RABBIT_OPTIONS);
	const configured = new Map(
		(options.queues ?? []).map((queue) => [queue.name, queue]),
	);

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

			const config = configured.get(sub.queue);
			connection.registerConsumer(
				new QueueConsumer({
					queue: sub.queue,
					handle: (message) => method.call(target, message),
					retry: options.retry,
					deadLetterQueue: config?.deadLetterQueue,
					// queues declared in the module topology are already asserted
					declareQueue: !config,
					breaker: options.circuitBreaker,
				}),
			);
		}
	}

	await connection.start();
}
