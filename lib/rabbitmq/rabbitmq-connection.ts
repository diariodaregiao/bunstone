import type { Channel, ChannelModel, ConfirmChannel } from "amqplib";
import { Logger } from "../utils/logger";
import type { RabbitMQModuleOptions } from "./interfaces/rabbitmq-options.interface";

const logger = new Logger("RabbitMQConnection");

/**
 * Manages the AMQP connection lifecycle, including topology assertion
 * (exchanges & queues) and automatic reconnection.
 *
 * The connection is lazy: it is established on the first call to
 * `getConsumerChannel()` or `getPublisherChannel()`.
 */
export class RabbitMQConnection {
	private static options: RabbitMQModuleOptions;

	/** Shared connection promise – reset on every reconnect attempt */
	private static connectionPromise: Promise<ChannelModel> | null = null;

	/** Dedicated channel for publishing (using ConfirmChannel for reliability) */
	private static publisherChannelPromise: Promise<ConfirmChannel> | null = null;

	/** Per-queue consumer channels */
	private static consumerChannels = new Map<string, Channel>();

	/** Whether the module has been configured */
	private static configured = false;

	/** Tracks how many reconnection attempts have been made in the current cycle */
	private static retryCount = 0;

	// ─── Public API ────────────────────────────────────────────────────────────

	static setOptions(options: RabbitMQModuleOptions): void {
		RabbitMQConnection.options = options;
		RabbitMQConnection.configured = true;
		// Reset state when options change (e.g. test re-registration)
		RabbitMQConnection.connectionPromise = null;
		RabbitMQConnection.publisherChannelPromise = null;
		RabbitMQConnection.consumerChannels.clear();
		RabbitMQConnection.retryCount = 0;
	}

	/** Returns the shared ConfirmChannel used for publishing. */
	static async getPublisherChannel(): Promise<ConfirmChannel> {
		if (!RabbitMQConnection.publisherChannelPromise) {
			RabbitMQConnection.publisherChannelPromise =
				RabbitMQConnection.getConnection().then((conn) =>
					conn.createConfirmChannel(),
				);
		}
		return RabbitMQConnection.publisherChannelPromise;
	}

	/**
	 * Returns a dedicated consumer channel for the given queue.
	 * Each queue gets its own channel so that prefetch applies per-queue.
	 */
	static async getConsumerChannel(queue: string): Promise<Channel> {
		const existing = RabbitMQConnection.consumerChannels.get(queue);
		if (existing) return existing;

		const connection = await RabbitMQConnection.getConnection();
		const channel = await connection.createChannel();

		const prefetch = RabbitMQConnection.options?.prefetch ?? 10;
		await channel.prefetch(prefetch);

		RabbitMQConnection.consumerChannels.set(queue, channel);
		return channel;
	}

	/**
	 * Creates a **new** channel with an exclusive, auto-delete server-named queue
	 * bound to `exchange` with `routingKey`.
	 *
	 * Because each call creates an independent queue, every handler that subscribes
	 * to the same exchange + routing key receives its own copy of the message
	 * (fan-out behaviour per routing key).
	 *
	 * The channel and queue are **not** cached – each call returns a fresh pair.
	 */
	static async createRoutingKeyConsumerChannel(
		exchange: string,
		routingKey: string,
	): Promise<{ channel: Channel; queueName: string }> {
		const connection = await RabbitMQConnection.getConnection();
		const channel = await connection.createChannel();

		const prefetch = RabbitMQConnection.options?.prefetch ?? 10;
		await channel.prefetch(prefetch);

		// Server-generated name, exclusive so only this consumer uses it,
		// autoDelete so it disappears when the consumer disconnects.
		const { queue: queueName } = await channel.assertQueue("", {
			exclusive: true,
			autoDelete: true,
			durable: false,
		});

		await channel.bindQueue(queueName, exchange, routingKey);
		logger.log(
			`Routing-key consumer queue "${queueName}" bound to exchange "${exchange}" with key "${routingKey}"`,
		);

		return { channel, queueName };
	}

	/**
	 * Initialises the connection, asserts all configured exchanges and queues,
	 * then resolves. Safe to call multiple times – returns the same promise.
	 */
	static async initialise(): Promise<void> {
		await RabbitMQConnection.getConnection();
	}

	/** Gracefully close all channels and the connection. */
	static async close(): Promise<void> {
		try {
			for (const channel of RabbitMQConnection.consumerChannels.values()) {
				await channel.close().catch(() => {});
			}
			RabbitMQConnection.consumerChannels.clear();

			if (RabbitMQConnection.publisherChannelPromise) {
				const ch = await RabbitMQConnection.publisherChannelPromise.catch(
					() => null,
				);
				if (ch) await ch.close().catch(() => {});
				RabbitMQConnection.publisherChannelPromise = null;
			}

			if (RabbitMQConnection.connectionPromise) {
				const conn = await RabbitMQConnection.connectionPromise.catch(
					() => null,
				);
				if (conn) await conn.close().catch(() => {});
				RabbitMQConnection.connectionPromise = null;
			}
		} catch {
			// Ignore teardown errors
		}
	}

	// ─── Internal helpers ───────────────────────────────────────────────────────

	private static getConnection(): Promise<ChannelModel> {
		if (!RabbitMQConnection.connectionPromise) {
			RabbitMQConnection.connectionPromise =
				RabbitMQConnection.createConnection();
		}
		return RabbitMQConnection.connectionPromise;
	}

	private static async createConnection(): Promise<ChannelModel> {
		RabbitMQConnection.assertConfigured();

		const uri = RabbitMQConnection.buildUri();
		const reconnect = {
			enabled: true,
			delay: 2000,
			maxRetries: 10,
			...RabbitMQConnection.options.reconnect,
		};

		while (true) {
			try {
				const amqplib = await import("amqplib");
				logger.log(
					`Connecting to RabbitMQ at ${RabbitMQConnection.sanitiseUri(uri)}…`,
				);
				const connection: ChannelModel = await amqplib.connect(uri);
				RabbitMQConnection.retryCount = 0;
				logger.log("RabbitMQ connection established.");

				// Wire up connection-level error handlers so we can reconnect
				connection.on("error", (err) => {
					logger.error(`RabbitMQ connection error: ${err.message}`);
					RabbitMQConnection.handleDisconnect();
				});

				connection.on("close", () => {
					logger.warn("RabbitMQ connection closed.");
					RabbitMQConnection.handleDisconnect();
				});

				// Assert topology
				await RabbitMQConnection.assertTopology(connection);

				return connection;
			} catch (err: any) {
				RabbitMQConnection.retryCount++;

				const maxRetries = reconnect.maxRetries ?? 10;
				const exceeded =
					maxRetries > 0 && RabbitMQConnection.retryCount >= maxRetries;

				if (!reconnect.enabled || exceeded) {
					logger.error(
						`Could not connect to RabbitMQ after ${RabbitMQConnection.retryCount} attempt(s): ${err.message}`,
					);
					throw err;
				}

				logger.warn(
					`RabbitMQ connection attempt ${RabbitMQConnection.retryCount}/${maxRetries === 0 ? "∞" : maxRetries} failed. Retrying in ${reconnect.delay}ms…`,
				);
				await RabbitMQConnection.sleep(reconnect.delay ?? 2000);
			}
		}
	}

	/** Invalidate cached promises so the next call triggers a fresh connection. */
	private static handleDisconnect(): void {
		RabbitMQConnection.connectionPromise = null;
		RabbitMQConnection.publisherChannelPromise = null;
		RabbitMQConnection.consumerChannels.clear();
	}

	/** Assert exchanges and queues declared in the module options. */
	private static async assertTopology(connection: ChannelModel): Promise<void> {
		const { exchanges = [], queues = [] } = RabbitMQConnection.options;

		if (exchanges.length === 0 && queues.length === 0) return;

		const channel = await connection.createChannel();

		try {
			// Assert exchanges
			for (const ex of exchanges) {
				await channel.assertExchange(ex.name, ex.type, {
					durable: ex.durable ?? true,
					autoDelete: ex.autoDelete ?? false,
					arguments: ex.arguments,
				});
				logger.log(`Exchange asserted: [${ex.type}] ${ex.name}`);
			}

			// Assert queues + bind
			for (const q of queues) {
				const args: Record<string, unknown> = { ...(q as any).arguments };

				if (q.deadLetterExchange) {
					args["x-dead-letter-exchange"] = q.deadLetterExchange;
				}
				if (q.deadLetterRoutingKey) {
					args["x-dead-letter-routing-key"] = q.deadLetterRoutingKey;
				}
				if (q.messageTtl !== undefined) {
					args["x-message-ttl"] = q.messageTtl;
				}
				if (q.maxLength !== undefined) {
					args["x-max-length"] = q.maxLength;
				}

				await channel.assertQueue(q.name, {
					durable: q.durable ?? true,
					exclusive: q.exclusive ?? false,
					autoDelete: q.autoDelete ?? false,
					arguments: Object.keys(args).length > 0 ? args : undefined,
				});
				logger.log(`Queue asserted: ${q.name}`);

				// Bind to exchange(s)
				const bindings = q.bindings
					? Array.isArray(q.bindings)
						? q.bindings
						: [q.bindings]
					: [];

				for (const binding of bindings) {
					await channel.bindQueue(
						q.name,
						binding.exchange,
						binding.routingKey ?? "",
						binding.arguments,
					);
					logger.log(
						`Queue "${q.name}" bound to exchange "${binding.exchange}" with key "${binding.routingKey ?? ""}"`,
					);
				}

				// ── Auto Dead Letter topology ──────────────────────────────────
				// When `deadLetterQueue` + `deadLetterExchange` are both set, the lib
				// automatically asserts the DLX exchange, the DLQ queue, and their binding.
				// This removes the need to declare them manually in exchanges/queues arrays.
				if (q.deadLetterQueue && q.deadLetterExchange) {
					const dlxType = q.deadLetterExchangeType ?? "direct";
					await channel.assertExchange(q.deadLetterExchange, dlxType, {
						durable: true,
						autoDelete: false,
					});
					logger.log(
						`Dead letter exchange asserted: [${dlxType}] ${q.deadLetterExchange}`,
					);

					await channel.assertQueue(q.deadLetterQueue, {
						durable: true,
						exclusive: false,
						autoDelete: false,
					});
					logger.log(`Dead letter queue asserted: ${q.deadLetterQueue}`);

					const dlxBindingKey = q.deadLetterRoutingKey ?? "";
					await channel.bindQueue(
						q.deadLetterQueue,
						q.deadLetterExchange,
						dlxBindingKey,
					);
					logger.log(
						`DLQ "${q.deadLetterQueue}" bound to DLX "${q.deadLetterExchange}" with key "${dlxBindingKey}"`,
					);
				}
			}
		} finally {
			await channel.close().catch(() => {});
		}
	}

	private static buildUri(): string {
		const o = RabbitMQConnection.options;
		if (o.uri) return o.uri;

		const host = o.host ?? "localhost";
		const port = o.port ?? 5672;
		const username = o.username ?? "guest";
		const password = o.password ?? "guest";
		const vhost = o.vhost ? encodeURIComponent(o.vhost) : "";
		return `amqp://${username}:${password}@${host}:${port}/${vhost}`;
	}

	/** Strip credentials from URI for safe logging */
	private static sanitiseUri(uri: string): string {
		try {
			const u = new URL(uri);
			u.password = "****";
			return u.toString();
		} catch {
			return uri.replace(/:\/\/[^@]+@/, "://****@");
		}
	}

	private static assertConfigured(): void {
		if (!RabbitMQConnection.configured) {
			throw new Error(
				"RabbitMQModule not configured. Call RabbitMQModule.register() in your AppModule imports.",
			);
		}
	}

	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
