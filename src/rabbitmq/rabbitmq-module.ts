import { Module } from "../module";
import { RabbitMQDeadLetterService } from "./dead-letter.service";
import type { RabbitMQModuleOptions } from "./interfaces/rabbitmq-options.interface";
import { RabbitMQService } from "./rabbitmq.service";
import { RabbitMQConnection } from "./rabbitmq-connection";

/**
 * RabbitMQ integration module for Bunstone.
 *
 * Register once in your root `AppModule` by calling `RabbitMQModule.register(options)`.
 * The module is **global** – `RabbitMQService` is available for injection everywhere.
 *
 * @example
 * ```typescript
 * import { Module } from "@grupodiariodaregiao/bunstone";
 * import { RabbitMQModule } from "@grupodiariodaregiao/bunstone";
 *
 * @Module({
 *   imports: [
 *     RabbitMQModule.register({
 *       uri: 'amqp://guest:guest@localhost:5672',
 *       exchanges: [{ name: 'orders', type: 'topic' }],
 *       queues: [
 *         {
 *           name: 'orders.created',
 *           bindings: { exchange: 'orders', routingKey: 'orders.created.*' },
 *         },
 *       ],
 *       prefetch: 10,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
	providers: [RabbitMQService, RabbitMQDeadLetterService],
	exports: [RabbitMQService, RabbitMQDeadLetterService],
	global: true,
})
export class RabbitMQModule {
	/**
	 * Configure and register the RabbitMQ module.
	 *
	 * @param options - Connection URI or individual connection fields, exchanges,
	 *                  queues, prefetch count and reconnection settings.
	 */
	static register(options: RabbitMQModuleOptions): typeof RabbitMQModule {
		RabbitMQConnection.setOptions(options);
		return RabbitMQModule;
	}
}
