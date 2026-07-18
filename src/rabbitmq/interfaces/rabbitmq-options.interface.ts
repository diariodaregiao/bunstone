/**
 * Configuration for a RabbitMQ exchange.
 */
export interface RabbitMQExchangeConfig {
	/** Exchange name */
	name: string;
	/** Exchange type */
	type: "direct" | "topic" | "fanout" | "headers";
	/** Whether the exchange survives broker restarts. Default: true */
	durable?: boolean;
	/** Whether the exchange is deleted when there are no remaining bindings. Default: false */
	autoDelete?: boolean;
	/** Additional exchange arguments */
	arguments?: Record<string, unknown>;
}

/**
 * Binding definition for a queue to an exchange.
 */
export interface RabbitMQQueueBinding {
	/** The exchange to bind to */
	exchange: string;
	/** Routing key pattern (supports wildcards for topic exchanges) */
	routingKey?: string;
	/** Additional binding arguments (used for headers exchanges) */
	arguments?: Record<string, unknown>;
}

/**
 * Configuration for a RabbitMQ queue.
 */
export interface RabbitMQQueueConfig {
	/** Queue name */
	name: string;
	/** Whether the queue survives broker restarts. Default: true */
	durable?: boolean;
	/** Whether the queue can only be used by one consumer and is deleted when that consumer disconnects. Default: false */
	exclusive?: boolean;
	/** Whether the queue is deleted when there are no more consumers. Default: false */
	autoDelete?: boolean;
	/** Bind this queue to one or more exchanges */
	bindings?: RabbitMQQueueBinding | RabbitMQQueueBinding[];
	/** Dead letter exchange name – messages rejected or expired are routed here */
	deadLetterExchange?: string;
	/** Dead letter routing key */
	deadLetterRoutingKey?: string;
	/**
	 * When provided, the lib will automatically:
	 * 1. Assert the `deadLetterExchange` (type controlled by `deadLetterExchangeType`)
	 * 2. Assert a queue with this name
	 * 3. Bind that queue to the DLX using `deadLetterRoutingKey` (or `""`)
	 *
	 * This removes the need to manually declare the DLX exchange + queue in your
	 * `exchanges` and `queues` arrays.
	 */
	deadLetterQueue?: string;
	/**
	 * Exchange type used when auto-asserting the dead letter exchange.
	 * Only used when `deadLetterQueue` is set. Default: `"direct"`.
	 */
	deadLetterExchangeType?: "direct" | "topic" | "fanout";
	/** Maximum time (ms) a message can remain in the queue undelivered */
	messageTtl?: number;
	/** Maximum number of messages the queue can hold */
	maxLength?: number;
}

/**
 * Reconnection configuration.
 */
export interface RabbitMQReconnectConfig {
	/** Enable automatic reconnection. Default: true */
	enabled?: boolean;
	/** Milliseconds to wait between reconnection attempts. Default: 2000 */
	delay?: number;
	/** Maximum reconnection attempts (0 = unlimited). Default: 10 */
	maxRetries?: number;
}

/**
 * Top-level options for RabbitMQModule.register().
 *
 * You can provide either a `uri` or individual connection fields.
 *
 * @example
 * ```typescript
 * RabbitMQModule.register({
 *   uri: 'amqp://guest:guest@localhost:5672',
 *   exchanges: [{ name: 'orders', type: 'topic' }],
 *   queues: [{
 *     name: 'orders.created',
 *     bindings: { exchange: 'orders', routingKey: 'orders.created.*' },
 *   }],
 * })
 * ```
 */
export interface RabbitMQModuleOptions {
	/** Full AMQP URI (e.g. `amqp://user:pass@host:5672/vhost`). Takes precedence over individual fields. */
	uri?: string;
	/** Broker hostname. Default: "localhost" */
	host?: string;
	/** Broker port. Default: 5672 */
	port?: number;
	/** AMQP username. Default: "guest" */
	username?: string;
	/** AMQP password. Default: "guest" */
	password?: string;
	/** Virtual host. Default: "/" */
	vhost?: string;
	/** Exchanges to assert on connection. */
	exchanges?: RabbitMQExchangeConfig[];
	/** Queues to assert on connection. */
	queues?: RabbitMQQueueConfig[];
	/** Global prefetch count (limits unacked messages per worker channel). Default: 10 */
	prefetch?: number;
	/** Reconnection settings */
	reconnect?: RabbitMQReconnectConfig;
}
