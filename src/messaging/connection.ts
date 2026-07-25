import { type ChannelModel, type ConfirmChannel, connect } from "amqplib";
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
		if (this.connection) {
			this.attachConsumer(this.connection, consumer).catch((error) =>
				this.logger.error(
					`Could not start consuming "${consumer.queue}":`,
					error,
				),
			);
		}
	}

	async start(): Promise<void> {
		try {
			await this.establish();
		} catch (error) {
			this.logger.error("Initial RabbitMQ connection failed:", error);
			if (!this.closing) void this.reconnect();
		}
	}

	/** The shared publisher channel, awaiting reconnection when necessary. */
	getChannel(): Promise<ConfirmChannel> {
		return this.channel ? Promise.resolve(this.channel) : this.ready;
	}

	/** False while the link is down; suitable as a readiness check. */
	isHealthy(): boolean {
		return !this.closing && Boolean(this.connection && this.channel);
	}

	async close(drainTimeoutMs = DEFAULT_DRAIN_TIMEOUT_MS): Promise<void> {
		this.closing = true;
		this.generation++;

		// stop deliveries and let in-flight handlers ack before the channels go
		await Promise.all(
			this.consumers.map((consumer) => consumer.close(drainTimeoutMs)),
		);

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
			const channel = await connection.createConfirmChannel();
			for (const setup of this.setups) await setup(channel);

			const consumerChannels: ConfirmChannel[] = [];
			for (const consumer of this.consumers) {
				consumerChannels.push(await this.attachConsumer(connection, consumer));
			}

			this.connection = connection;
			this.channel = channel;
			this.consumerChannels = consumerChannels;
			this.watch(connection, [channel, ...consumerChannels], generation);
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
	private watch(
		connection: ChannelModel,
		channels: ConfirmChannel[],
		generation: number,
	): void {
		const onDown = (source: string) => (error?: unknown) => {
			if (this.generation !== generation || this.closing) return;
			if (error) this.logger.warn(`RabbitMQ ${source} error:`, error);
			this.handleDown();
		};

		connection.on("close", onDown("connection"));
		connection.on("error", onDown("connection"));
		for (const channel of channels) {
			channel.on("close", onDown("channel"));
			channel.on("error", onDown("channel"));
		}
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
				} catch {
					this.logger.warn(`RabbitMQ reconnect attempt ${attempt} failed.`);
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
