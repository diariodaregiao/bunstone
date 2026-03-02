import type { ConsumeMessage } from "amqplib";

/**
 * A typed RabbitMQ message received by a `@RabbitSubscribe` handler.
 *
 * @example
 * ```typescript
 * @RabbitSubscribe({ queue: 'orders.created' })
 * async handle(msg: RabbitMessage<{ orderId: string }>) {
 *   console.log(msg.data.orderId);
 *   msg.ack();
 * }
 * ```
 */
export interface RabbitMessage<T = unknown> {
	/** Deserialized message payload */
	data: T;
	/** Raw amqplib ConsumeMessage */
	raw: ConsumeMessage;
	/** Acknowledge the message (remove from queue) */
	ack: () => void;
	/** Reject + optionally requeue the message */
	nack: (requeue?: boolean) => void;
	/** Reject without requeueing */
	reject: () => void;
}

/**
 * Options for publishing a message.
 */
export interface RabbitPublishOptions {
	/** Message content type header. Default: "application/json" */
	contentType?: string;
	/** Message encoding. Default: "utf-8" */
	contentEncoding?: string;
	/** Message expiration in ms */
	expiration?: number | string;
	/** Message priority (0-9) */
	priority?: number;
	/** Makes the message persistent (survives broker restart). Default: true */
	persistent?: boolean;
	/** Custom headers */
	headers?: Record<string, unknown>;
	/** Correlation identifier */
	correlationId?: string;
	/** Reply-to queue name */
	replyTo?: string;
	/** Application-specific message id */
	messageId?: string;
}

/**
 * Options for the `@RabbitSubscribe` method decorator.
 */
export interface RabbitSubscribeOptions {
	/**
	 * Queue to consume messages from.
	 * The queue must be declared either via `RabbitMQModule.register({ queues: [...] })` or by the broker.
	 */
	queue: string;
	/**
	 * When `true`, messages are automatically acknowledged as soon as they are delivered.
	 * When `false` (default), you must call `msg.ack()` / `msg.nack()` manually.
	 */
	noAck?: boolean;
}
