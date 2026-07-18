import type { Options } from "amqplib";
import { Injectable } from "@/core/injectable";
import { RabbitConnection } from "./connection";

@Injectable()
export class RabbitMQService {
	constructor(private readonly connection: RabbitConnection) {}

	async publish(
		exchange: string,
		routingKey: string,
		message: unknown,
		options?: Options.Publish,
	): Promise<void> {
		const channel = await this.connection.getChannel();
		channel.publish(exchange, routingKey, encode(message), {
			persistent: true,
			...options,
		});
	}

	async sendToQueue(
		queue: string,
		message: unknown,
		options?: Options.Publish,
	): Promise<void> {
		const channel = await this.connection.getChannel();
		channel.sendToQueue(queue, encode(message), {
			persistent: true,
			...options,
		});
	}
}

function encode(message: unknown): Buffer {
	return Buffer.from(JSON.stringify(message));
}
