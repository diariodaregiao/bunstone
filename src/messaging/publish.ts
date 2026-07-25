import type { ConfirmChannel } from "amqplib";
import { RabbitMQError } from "@/errors";

/** Correlates a `basic.return` with the publish that caused it. */
export const PUBLISH_ID_HEADER = "x-bunstone-publish";

type Pending = Map<string, () => void>;

const trackers = new WeakMap<ConfirmChannel, Pending>();
let sequence = 0;

/**
 * `return` is a channel-wide event, so a single listener per publish would let
 * one unroutable message mark every in-flight publish on that channel as
 * failed. One listener per channel, keyed by a correlation header, keeps the
 * verdict attached to the publish it belongs to.
 */
function pendingFor(channel: ConfirmChannel): Pending {
	const existing = trackers.get(channel);
	if (existing) return existing;

	const pending: Pending = new Map();
	trackers.set(channel, pending);
	channel.on("return", (message) => {
		const id = message.properties?.headers?.[PUBLISH_ID_HEADER];
		if (typeof id === "string") pending.get(id)?.();
	});
	return pending;
}

export interface PublishOptions {
	/** Reject when the broker cannot route the message to any queue. */
	mandatory: boolean;
}

/**
 * Resolves once the broker has confirmed the publish. With `mandatory`, a
 * message the broker could not route rejects instead of resolving — the broker
 * acknowledges unroutable publishes, so a confirm alone proves nothing landed.
 */
export function publishConfirmed(
	channel: ConfirmChannel,
	target: string,
	options: PublishOptions,
	send: (
		headers: Record<string, unknown>,
		mandatory: boolean,
		callback: (error: Error | null) => void,
	) => boolean,
): Promise<void> {
	if (!options.mandatory) {
		return new Promise((resolve, reject) => {
			send({}, false, (error) => (error ? reject(error) : resolve()));
		});
	}

	const pending = pendingFor(channel);
	const id = `${++sequence}`;

	return new Promise((resolve, reject) => {
		let returned = false;
		pending.set(id, () => {
			returned = true;
		});

		send({ [PUBLISH_ID_HEADER]: id }, true, (error) => {
			pending.delete(id);
			if (error) return reject(error);
			// the return always arrives before the confirm for the same message
			if (returned) {
				return reject(
					new RabbitMQError(
						`"${target}" did not accept the message: it was not routed to any queue.`,
						"BNS-RMQ-002",
						"Check that the queue exists, or that the exchange has a binding matching this routing key.",
						{ target },
					),
				);
			}
			resolve();
		});
	});
}
