import { type Channel, type ChannelModel, connect } from "amqplib";
import { Logger } from "@/utils/logger";
import type { RabbitReconnectOptions } from "./types";

export interface RabbitConnectionOptions {
	uri: string;
	prefetch?: number;
	reconnect?: RabbitReconnectOptions;
}

type Setup = (channel: Channel) => Promise<void>;

export class RabbitConnection {
	private connection?: ChannelModel;
	private channel?: Channel;
	private readonly setups: Setup[] = [];
	private closing = false;
	private ready: Promise<Channel>;
	private resolveReady!: (channel: Channel) => void;
	private readonly logger = new Logger("Rabbit");

	constructor(private readonly options: RabbitConnectionOptions) {
		this.ready = this.freshReady();
	}

	registerSetup(setup: Setup): void {
		this.setups.push(setup);
		if (this.channel) void setup(this.channel);
	}

	async start(): Promise<void> {
		try {
			await this.establish();
		} catch (error) {
			this.logger.error("Initial RabbitMQ connection failed:", error);
			if (!this.closing) void this.reconnect();
		}
	}

	getChannel(): Promise<Channel> {
		return this.channel ? Promise.resolve(this.channel) : this.ready;
	}

	async close(): Promise<void> {
		this.closing = true;
		await this.safeClose();
	}

	private freshReady(): Promise<Channel> {
		return new Promise<Channel>((resolve) => {
			this.resolveReady = resolve;
		});
	}

	private async establish(): Promise<void> {
		const connection = await connect(this.options.uri);
		const channel = await connection.createChannel();
		if (this.options.prefetch) await channel.prefetch(this.options.prefetch);

		this.connection = connection;
		this.channel = channel;
		connection.on("close", () => this.handleClose());
		connection.on("error", () => undefined);

		for (const setup of this.setups) await setup(channel);
		this.resolveReady(channel);
	}

	private handleClose(): void {
		this.channel = undefined;
		this.connection = undefined;
		this.ready = this.freshReady();
		if (!this.closing) void this.reconnect();
	}

	private async reconnect(): Promise<void> {
		if (this.options.reconnect?.enabled === false) return;
		const delayMs = this.options.reconnect?.delayMs ?? 2000;
		const maxRetries = this.options.reconnect?.maxRetries ?? 0;

		let attempt = 0;
		while (!this.closing) {
			attempt++;
			await Bun.sleep(delayMs);
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
	}

	private async safeClose(): Promise<void> {
		try {
			await this.channel?.close();
		} catch {}
		try {
			await this.connection?.close();
		} catch {}
		this.channel = undefined;
		this.connection = undefined;
	}
}
