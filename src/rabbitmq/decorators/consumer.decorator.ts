import "reflect-metadata";
import { Injectable } from "../../injectable";
import { RABBITMQ_CONSUMER_METADATA } from "../constants";

/**
 * Marks a class as a RabbitMQ consumer.
 *
 * Classes decorated with `@RabbitConsumer()` are scanned for `@RabbitSubscribe`
 * methods at application startup. The class must also be listed in the
 * `providers` array of its module.
 *
 * @example
 * ```typescript
 * @RabbitConsumer()
 * export class OrderConsumer {
 *   @RabbitSubscribe({ queue: 'orders.created' })
 *   async handle(msg: RabbitMessage<Order>) {
 *     console.log(msg.data);
 *     msg.ack();
 *   }
 * }
 * ```
 */
export function RabbitConsumer(): ClassDecorator {
	return (target: any) => {
		Reflect.defineMetadata(RABBITMQ_CONSUMER_METADATA, true, target);
		Injectable()(target);
	};
}
