import "reflect-metadata";
import {
	RABBITMQ_SUBSCRIBE_METADATA,
	RABBITMQ_SUBSCRIBE_SYMBOL,
} from "../constants";
import type { RabbitSubscribeOptions } from "../interfaces/rabbitmq-message.interface";

export type { RabbitSubscribeOptions };

/**
 * Marks a method as a RabbitMQ message handler.
 *
 * The method will be called whenever a message arrives on `options.queue`.
 * By default, messages require manual acknowledgement via `msg.ack()` or `msg.nack()`.
 * Set `noAck: true` to acknowledge automatically on delivery.
 *
 * @param options - Queue name and acknowledgement mode
 *
 * @example
 * ```typescript
 * // Manual ack (default)
 * @RabbitSubscribe({ queue: 'orders.created' })
 * async handleOrder(msg: RabbitMessage<{ orderId: string }>) {
 *   await processOrder(msg.data);
 *   msg.ack();
 * }
 *
 * // Auto ack
 * @RabbitSubscribe({ queue: 'notifications', noAck: true })
 * async notify(msg: RabbitMessage<Notification>) {
 *   sendPush(msg.data);
 * }
 * ```
 */
export function RabbitSubscribe(
	options: RabbitSubscribeOptions,
): MethodDecorator {
	return (target: any, propertyKey: string | symbol) => {
		// Store options in an array on the prototype under the shared symbol
		// so the mapper can discover all handlers on a class
		const existing: any[] = target[RABBITMQ_SUBSCRIBE_SYMBOL] ?? [];
		existing.push({
			methodName: propertyKey as string,
			options,
			type: "rabbitmq",
		});
		target[RABBITMQ_SUBSCRIBE_SYMBOL] = existing;

		// Also keep per-method metadata for direct reflection access
		Reflect.defineMetadata(
			RABBITMQ_SUBSCRIBE_METADATA,
			options,
			target,
			propertyKey,
		);
	};
}
