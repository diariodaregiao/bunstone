import type { Options } from "amqplib";
import { Injectable } from "@/core/injectable";
import { RabbitConnection } from "./connection";

/**
 * Publishes on a confirm channel: the returned promise settles only once the
 * broker has taken responsibility for the message, so a rejected or dropped
 * publish surfaces as an error instead of vanishing.
 */
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
		await confirmed((callback) =>
			channel.publish(
				exchange,
				routingKey,
				encode(message),
				{
					persistent: true,
					...options,
				},
				callback,
			),
		);
	}

	async sendToQueue(
		queue: string,
		message: unknown,
		options?: Options.Publish,
	): Promise<void> {
		const channel = await this.connection.getChannel();
		await confirmed((callback) =>
			channel.sendToQueue(
				queue,
				encode(message),
				{
					persistent: true,
					...options,
				},
				callback,
			),
		);
	}
}

type ConfirmCallback = (error: Error | null) => void;

function confirmed(
	send: (callback: ConfirmCallback) => boolean,
): Promise<void> {
	return new Promise((resolve, reject) => {
		send((error) => (error ? reject(error) : resolve()));
	});
}

function encode(message: unknown): Buffer {
	return Buffer.from(JSON.stringify(message));
}
