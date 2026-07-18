import type { ConsumeMessage } from "amqplib";

export interface RabbitMessage<T = unknown> {
	data: T;
	raw: ConsumeMessage;
	attempt: number;
}

export interface RabbitReconnectOptions {
	enabled?: boolean;
	delayMs?: number;
	maxRetries?: number;
}

export interface RabbitExchangeConfig {
	name: string;
	type?: "direct" | "topic" | "fanout" | "headers";
	durable?: boolean;
}

export interface RabbitBinding {
	exchange: string;
	routingKey: string;
}

export interface RabbitQueueConfig {
	name: string;
	durable?: boolean;
	bindings?: RabbitBinding[];
	deadLetterQueue?: string;
}
