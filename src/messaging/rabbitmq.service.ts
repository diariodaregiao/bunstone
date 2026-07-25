import type { Options } from "amqplib";
import { Injectable } from "@/core/injectable";
import { RabbitMQError } from "@/errors";
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
		await confirmed(channel, `${exchange}/${routingKey}`, (callback) =>
			channel.publish(
				exchange,
				routingKey,
				encode(message),
				{ persistent: true, ...options, mandatory: true },
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
		await confirmed(channel, queue, (callback) =>
			channel.sendToQueue(
				queue,
				encode(message),
				{ persistent: true, ...options, mandatory: true },
				callback,
			),
		);
	}
}

type ConfirmCallback = (error: Error | null) => void;

interface Returnable {
	once(event: "return", listener: () => void): unknown;
	removeListener(event: "return", listener: () => void): unknown;
}

/**
 * The broker confirms a publish it could not route, so `mandatory` is set and a
 * returned message is reported as an error rather than as a successful send.
 */
function confirmed(
	channel: Returnable,
	target: string,
	send: (callback: ConfirmCallback) => boolean,
): Promise<void> {
	return new Promise((resolve, reject) => {
		let returned = false;
		const onReturn = () => {
			returned = true;
		};
		channel.once("return", onReturn);

		send((error) => {
			channel.removeListener("return", onReturn);
			if (error) return reject(error);
			if (returned) {
				return reject(
					new RabbitMQError(`"${target}" did not accept the message.`),
				);
			}
			resolve();
		});
	});
}

function encode(message: unknown): Buffer {
	return Buffer.from(JSON.stringify(message));
}
