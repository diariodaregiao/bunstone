import type { ConsumeMessage } from "amqplib";

// ─── Dead Letter types ──────────────────────────────────────────────────────

/**
 * Information extracted from the `x-death` header that RabbitMQ automatically
 * attaches to every dead-lettered message.
 */
export interface DeadLetterDeathInfo {
	/** Queue where the message was dead-lettered */
	queue: string;
	/** Exchange where the message was originally published */
	exchange: string;
	/** Routing keys the message was published with */
	routingKeys: string[];
	/** How many times this message has been dead-lettered */
	count: number;
	/** Reason for dead-lettering */
	reason: "rejected" | "expired" | "maxlen" | "delivery-limit";
	/** Timestamp when the message was dead-lettered */
	time: Date;
}

/**
 * A message consumed from a Dead Letter Queue with extra context and
 * a `republish()` helper for reprocessing.
 *
 * @example
 * ```typescript
 * @RabbitConsumer()
 * export class OrderDLQConsumer {
 *   constructor(private readonly dlq: RabbitMQDeadLetterService) {}
 *
 *   @RabbitSubscribe({ queue: 'orders.dlq' })
 *   async handle(msg: DeadLetterMessage<OrderPayload>) {
 *     console.log('Failed', msg.deathInfo?.reason, msg.data);
 *     await msg.republish('events', 'orders.created'); // retry
 *     msg.ack();
 *   }
 * }
 * ```
 */
export interface DeadLetterMessage<T = unknown> {
	/** Deserialized message payload */
	data: T;
	/** Raw amqplib ConsumeMessage */
	raw: ConsumeMessage;
	/**
	 * Death metadata provided by RabbitMQ via `x-death` headers.
	 * `null` if the message was not dead-lettered by the broker.
	 */
	deathInfo: DeadLetterDeathInfo | null;
	/** Acknowledge and remove the message from the DLQ */
	ack: () => void;
	/** Negative-ack (optionally requeue back to DLQ). Default requeue: false */
	nack: (requeue?: boolean) => void;
	/**
	 * Republish the message to an exchange for reprocessing.
	 * The original payload is preserved as-is.
	 */
	republish: (
		exchange: string,
		routingKey: string,
		options?: RabbitPublishOptions,
	) => Promise<void>;
}

/**
 * Options for `RabbitMQDeadLetterService.requeueMessages()`.
 */
export interface RequeueOptions {
	/** Dead letter queue to consume from */
	fromQueue: string;
	/** Exchange to republish the messages to */
	toExchange: string;
	/** Routing key for the republished messages */
	routingKey: string;
	/** Maximum number of messages to requeue. Omit to requeue all. */
	count?: number;
	/** Additional publish options applied during requeue */
	publishOptions?: RabbitPublishOptions;
}

// ─── Standard message ───────────────────────────────────────────────────────

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
