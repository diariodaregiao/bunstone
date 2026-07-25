import { type ChannelModel, type ConfirmChannel, connect } from "amqplib";
import { RabbitMQError } from "@/errors";
import { Logger } from "@/utils/logger";
import type { QueueConsumer } from "./consumer";
import type { RabbitReconnectOptions } from "./types";

export interface RabbitConnectionOptions {
	uri: string;
	prefetch?: number;
	reconnect?: RabbitReconnectOptions;
}

type Setup = (channel: ConfirmChannel) => Promise<void>;

const DEFAULT_PREFETCH = 10;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;
const DEFAULT_PUBLISH_TIMEOUT_MS = 10_000;

export class RabbitConnection {
	private connection?: ChannelModel;
	private channel?: ConfirmChannel;
	private consumerChannels: ConfirmChannel[] = [];
	private readonly setups: Setup[] = [];
	private readonly consumers: QueueConsumer[] = [];
	private closing = false;
	private reconnecting = false;
	/** Bumped on every teardown so listeners from a dead link stay quiet. */
	private generation = 0;
	private ready: Promise<ConfirmChannel>;
	private resolveReady!: (channel: ConfirmChannel) => void;
	private readonly logger = new Logger("Rabbit");

	constructor(private readonly options: RabbitConnectionOptions) {
		this.ready = this.freshReady();
	}

	registerSetup(setup: Setup): void {
		this.setups.push(setup);
		if (this.channel) {
			setup(this.channel).catch((error) =>
				this.logger.error("RabbitMQ setup failed:", error),
			);
		}
	}

	registerConsumer(consumer: QueueConsumer): void {
		this.consumers.push(consumer);
		const connection = this.connection;
		if (!connection) return;

		this.attachConsumer(connection, consumer)
			.then((channel) => {
				// tracked and watched, so a failure on it still triggers recovery
				this.consumerChannels.push(channel);
				this.watchChannel(channel, this.generation);
			})
			.catch((error) =>
				this.logger.error(
					`Could not start consuming "${consumer.queue}":`,
					error,
				),
			);
	}

	async start(): Promise<void> {
		try {
			await this.establish();
		} catch (error) {
			this.logger.error("Initial RabbitMQ connection failed:", error);
			if (!this.closing) void this.reconnect();
		}
	}

	/**
	 * The shared publisher channel. Waiting is bounded: an unbounded wait would
	 * pin an HTTP handler for as long as the broker stays down.
	 */
	getChannel(timeoutMs = DEFAULT_PUBLISH_TIMEOUT_MS): Promise<ConfirmChannel> {
		if (this.channel) return Promise.resolve(this.channel);
		return Promise.race([
			this.ready,
			Bun.sleep(timeoutMs).then<never>(() => {
				throw new RabbitMQError(
					"Timed out waiting for a RabbitMQ connection.",
					"BNS-RMQ-001",
					"The broker is unreachable. Check the connection and consider queueing the publish yourself.",
				);
			}),
		]);
	}

	/** False while the link is down; suitable as a readiness check. */
	isHealthy(): boolean {
		return !this.closing && Boolean(this.connection && this.channel);
	}

	/**
	 * Stops deliveries and waits for in-flight handlers, leaving the connection
	 * open so shutdown hooks can still publish. `close()` releases it.
	 */
	async stopConsuming(
		drainTimeoutMs = DEFAULT_DRAIN_TIMEOUT_MS,
	): Promise<void> {
		await Promise.all(
			this.consumers.map((consumer) => consumer.close(drainTimeoutMs)),
		);
	}

	async close(drainTimeoutMs = DEFAULT_DRAIN_TIMEOUT_MS): Promise<void> {
		this.closing = true;
		this.generation++;

		await this.stopConsuming(drainTimeoutMs);

		for (const channel of [this.channel, ...this.consumerChannels]) {
			try {
				await channel?.close();
			} catch {}
		}
		try {
			await this.connection?.close();
		} catch {}

		this.channel = undefined;
		this.connection = undefined;
		this.consumerChannels = [];
	}

	private get prefetch(): number {
		return this.options.prefetch ?? DEFAULT_PREFETCH;
	}

	private freshReady(): Promise<ConfirmChannel> {
		return new Promise<ConfirmChannel>((resolve) => {
			this.resolveReady = resolve;
		});
	}

	private async establish(): Promise<void> {
		const connection = await connect(this.options.uri);
		const generation = this.generation;

		try {
			this.watchConnection(connection, generation);
			const channel = await connection.createConfirmChannel();
			// listeners go on before any setup runs: a topology conflict during
			// `establish` would otherwise be an unhandled 'error' event
			this.watchChannel(channel, generation);
			for (const setup of this.setups) await setup(channel);

			const consumerChannels: ConfirmChannel[] = [];
			for (const consumer of this.consumers) {
				const consumerChannel = await connection.createConfirmChannel();
				this.watchChannel(consumerChannel, generation);
				await consumerChannel.prefetch(this.prefetch);
				await consumer.attach(consumerChannel);
				consumerChannels.push(consumerChannel);
			}

			// `close()` may have run while we were connecting
			if (this.closing) {
				await closeQuietly(connection);
				return;
			}

			this.connection = connection;
			this.channel = channel;
			this.consumerChannels = consumerChannels;
			this.resolveReady(channel);
		} catch (error) {
			for (const consumer of this.consumers) consumer.detach();
			await closeQuietly(connection);
			throw error;
		}
	}

	private async attachConsumer(
		connection: ChannelModel,
		consumer: QueueConsumer,
	): Promise<ConfirmChannel> {
		const channel = await connection.createConfirmChannel();
		await channel.prefetch(this.prefetch);
		await consumer.attach(channel);
		return channel;
	}

	/**
	 * A dead channel is as fatal as a dead connection — without this, a
	 * channel-level error (a bad exchange, a topology conflict) would silently
	 * stop every consumer while the socket stayed up.
	 */
	private downHandler(source: string, generation: number) {
		return (error?: unknown) => {
			if (this.generation !== generation || this.closing) return;
			if (error) this.logger.warn(`RabbitMQ ${source} error:`, error);
			this.handleDown();
		};
	}

	/** Attached once per connection; adding a pair per channel would trip
	 * Node's max-listener warning as soon as a handful of consumers exist. */
	private watchConnection(connection: ChannelModel, generation: number): void {
		const onDown = this.downHandler("connection", generation);
		connection.on("close", onDown);
		connection.on("error", onDown);
	}

	private watchChannel(channel: ConfirmChannel, generation: number): void {
		const onDown = this.downHandler("channel", generation);
		channel.on("close", onDown);
		channel.on("error", onDown);
	}

	private handleDown(): void {
		this.generation++;
		for (const consumer of this.consumers) consumer.detach();

		const dead = this.connection;
		this.connection = undefined;
		this.channel = undefined;
		this.consumerChannels = [];
		this.ready = this.freshReady();

		// a channel can die while the socket lives; drop it so we start clean
		void closeQuietly(dead);
		if (!this.closing) void this.reconnect();
	}

	private async reconnect(): Promise<void> {
		if (this.reconnecting || this.closing) return;
		if (this.options.reconnect?.enabled === false) return;

		this.reconnecting = true;
		const delayMs =
			this.options.reconnect?.delayMs ?? DEFAULT_RECONNECT_DELAY_MS;
		const maxRetries = this.options.reconnect?.maxRetries ?? 0;
		let attempt = 0;

		try {
			while (!this.closing) {
				attempt++;
				await Bun.sleep(jitter(delayMs));
				if (this.closing) return;
				try {
					await this.establish();
					this.logger.log("Reconnected to RabbitMQ.");
					return;
				} catch (error) {
					this.logger.warn(
						`RabbitMQ reconnect attempt ${attempt} failed:`,
						error,
					);
					if (maxRetries > 0 && attempt >= maxRetries) {
						this.logger.error("Giving up reconnecting to RabbitMQ.");
						return;
					}
				}
			}
		} finally {
			this.reconnecting = false;
		}
	}
}

/** Spreads retries of many replicas so they do not stampede the broker. */
function jitter(delayMs: number): number {
	return Math.round(delayMs * (0.8 + Math.random() * 0.4));
}

async function closeQuietly(connection?: ChannelModel): Promise<void> {
	try {
		await connection?.close();
	} catch {}
}
