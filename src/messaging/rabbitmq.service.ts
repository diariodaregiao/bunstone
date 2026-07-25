import type { Options } from "amqplib";
import { Injectable } from "@/core/injectable";
import { RabbitConnection } from "./connection";
import { publishConfirmed } from "./publish";

/**
 * Publishes on a confirm channel: the returned promise settles only once the
 * broker has taken responsibility for the message, so a rejected or dropped
 * publish surfaces as an error instead of vanishing.
 */
@Injectable()
export class RabbitMQService {
	constructor(private readonly connection: RabbitConnection) {}

	/**
	 * Publishing to an exchange with no matching binding is normal (a subscriber
	 * that is not deployed yet), so this does not fail by default. Pass
	 * `mandatory: true` when the message must reach a queue.
	 */
	async publish(
		exchange: string,
		routingKey: string,
		message: unknown,
		options?: Options.Publish,
	): Promise<void> {
		const channel = await this.connection.getChannel();
		await publishConfirmed(
			channel,
			`${exchange}/${routingKey}`,
			{ mandatory: options?.mandatory === true },
			(headers, mandatory, callback) =>
				channel.publish(
					exchange,
					routingKey,
					encode(message),
					{
						persistent: true,
						...options,
						mandatory,
						headers: { ...options?.headers, ...headers },
					},
					callback,
				),
		);
	}

	/** A queue that does not exist is always an error, so this is `mandatory`. */
	async sendToQueue(
		queue: string,
		message: unknown,
		options?: Options.Publish,
	): Promise<void> {
		const channel = await this.connection.getChannel();
		await publishConfirmed(
			channel,
			queue,
			{ mandatory: true },
			(headers, mandatory, callback) =>
				channel.sendToQueue(
					queue,
					encode(message),
					{
						persistent: true,
						...options,
						mandatory,
						headers: { ...options?.headers, ...headers },
					},
					callback,
				),
		);
	}
}

function encode(message: unknown): Buffer {
	return Buffer.from(JSON.stringify(message));
}
