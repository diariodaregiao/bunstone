import "reflect-metadata";
import type { Options } from "amqplib";
import { Injectable } from "../injectable";
import { Logger } from "../utils/logger";
import type { RabbitPublishOptions } from "./interfaces/rabbitmq-message.interface";
import { RabbitMQConnection } from "./rabbitmq-connection";

/**
 * Service for publishing messages to RabbitMQ exchanges and queues.
 *
 * Inject this service into your providers/controllers to send messages.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderService {
 *   constructor(private readonly rabbit: RabbitMQService) {}
 *
 *   async placeOrder(order: Order) {
 *     await this.rabbit.publish('orders', 'orders.placed', order);
 *   }
 * }
 * ```
 */
@Injectable()
export class RabbitMQService {
	private readonly logger = new Logger(RabbitMQService.name);

	/**
	 * Publish a message to an exchange.
	 *
	 * @param exchange - Target exchange name
	 * @param routingKey - Routing key (use `""` for fanout exchanges)
	 * @param data - Message payload – will be JSON-serialised automatically
	 * @param options - Optional publish options (headers, priority, expiration…)
	 */
	async publish(
		exchange: string,
		routingKey: string,
		data: unknown,
		options?: RabbitPublishOptions,
	): Promise<void> {
		const channel = await RabbitMQConnection.getPublisherChannel();

		const content = Buffer.from(JSON.stringify(data));

		const publishOptions: Options.Publish = {
			persistent: options?.persistent ?? true,
			contentType: options?.contentType ?? "application/json",
			contentEncoding: options?.contentEncoding ?? "utf-8",
			headers: options?.headers,
			correlationId: options?.correlationId,
			replyTo: options?.replyTo,
			messageId: options?.messageId,
			expiration:
				options?.expiration !== undefined
					? String(options.expiration)
					: undefined,
			priority: options?.priority,
		};

		await new Promise<void>((resolve, reject) => {
			channel.publish(exchange, routingKey, content, publishOptions, (err) => {
				if (err) {
					this.logger.error(
						`Failed to publish to exchange "${exchange}" with key "${routingKey}": ${err.message}`,
					);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Send a message directly to a queue (bypasses exchange routing).
	 *
	 * @param queue - Target queue name
	 * @param data - Message payload – will be JSON-serialised automatically
	 * @param options - Optional publish options
	 */
	async sendToQueue(
		queue: string,
		data: unknown,
		options?: RabbitPublishOptions,
	): Promise<void> {
		const channel = await RabbitMQConnection.getPublisherChannel();

		const content = Buffer.from(JSON.stringify(data));

		const publishOptions: Options.Publish = {
			persistent: options?.persistent ?? true,
			contentType: options?.contentType ?? "application/json",
			contentEncoding: options?.contentEncoding ?? "utf-8",
			headers: options?.headers,
			correlationId: options?.correlationId,
			replyTo: options?.replyTo,
			messageId: options?.messageId,
			expiration:
				options?.expiration !== undefined
					? String(options.expiration)
					: undefined,
			priority: options?.priority,
		};

		await new Promise<void>((resolve, reject) => {
			channel.sendToQueue(queue, content, publishOptions, (err) => {
				if (err) {
					this.logger.error(
						`Failed to send message to queue "${queue}": ${err.message}`,
					);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
