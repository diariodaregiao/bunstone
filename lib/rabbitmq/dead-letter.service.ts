import "reflect-metadata";
import type { GetMessage, Message, Options } from "amqplib";
import { Injectable } from "../injectable";
import { Logger } from "../utils/logger";
import type {
	DeadLetterDeathInfo,
	DeadLetterMessage,
	RabbitPublishOptions,
	RequeueOptions,
} from "./interfaces/rabbitmq-message.interface";
import { RabbitMQConnection } from "./rabbitmq-connection";

/**
 * Service for inspecting and reprocessing messages in Dead Letter Queues.
 *
 * Inject `RabbitMQDeadLetterService` wherever you need to manage failed messages –
 * in controllers (for admin REST endpoints), scheduled tasks, or one-off scripts.
 *
 * @example
 * ```typescript
 * // Requeue all stuck orders
 * @Get('/admin/dlq/requeue')
 * async requeueOrders() {
 *   const count = await this.dlq.requeueMessages({
 *     fromQueue:  'orders.dlq',
 *     toExchange: 'events',
 *     routingKey: 'orders.created',
 *   });
 *   return { requeued: count };
 * }
 * ```
 */
@Injectable()
export class RabbitMQDeadLetterService {
	private readonly logger = new Logger(RabbitMQDeadLetterService.name);

	// ─── Inspect ────────────────────────────────────────────────────────────────

	/**
	 * Peek at messages in a Dead Letter Queue **without permanently consuming them**.
	 *
	 * Internally uses `basic.get` + `nack(requeue=true)` so every inspected message
	 * is put back at the tail of the queue after inspection.
	 *
	 * > **Note:** Because AMQP has no native "peek" operation, there is a small
	 * > window where another consumer could receive the message between the `get`
	 * > and the `nack`. Use a dedicated DLQ that is only consumed by this service
	 * > (or consumed manually) to avoid race conditions.
	 *
	 * @param queue - Name of the dead letter queue to inspect
	 * @param count - Maximum number of messages to return. Default: `10`
	 * @returns Array of `DeadLetterMessage` wrappers with death metadata
	 *
	 * @example
	 * ```typescript
	 * const messages = await this.dlq.inspect<OrderPayload>('orders.dlq', 5);
	 * for (const msg of messages) {
	 *   console.log(msg.deathInfo?.reason, msg.data);
	 * }
	 * ```
	 */
	async inspect<T = unknown>(
		queue: string,
		count = 10,
	): Promise<DeadLetterMessage<T>[]> {
		const pubCh = await RabbitMQConnection.getPublisherChannel();
		const ch = await RabbitMQConnection.getConsumerChannel(
			`__dlq_inspect_${queue}`,
		);

		const results: DeadLetterMessage<T>[] = [];

		for (let i = 0; i < count; i++) {
			const raw = await ch.get(queue, { noAck: false });
			if (!raw) break;

			const data = this.parsePayload<T>(raw);
			const deathInfo = this.extractDeathInfo(raw);

			results.push(this.buildWrapper<T>(ch, raw, data, deathInfo, pubCh));

			// Put message back so it is not permanently consumed
			ch.nack(raw, false, true);
		}

		// Release the inspection channel slot
		await ch.close().catch(() => {});

		return results;
	}

	// ─── Requeue ─────────────────────────────────────────────────────────────

	/**
	 * Move messages from a Dead Letter Queue back to an exchange for reprocessing.
	 *
	 * Each message is `ack`-ed from the DLQ only **after** it is successfully
	 * republished, so no messages are lost even if publishing fails mid-batch.
	 *
	 * @param options - Source queue, target exchange/routing-key, optional count cap
	 * @returns Number of messages successfully requeued
	 *
	 * @example
	 * ```typescript
	 * // Requeue up to 50 messages back to the original exchange
	 * const n = await this.dlq.requeueMessages({
	 *   fromQueue:  'orders.dlq',
	 *   toExchange: 'events',
	 *   routingKey: 'orders.created',
	 *   count: 50,
	 * });
	 * console.log(`Requeued ${n} messages`);
	 * ```
	 */
	async requeueMessages(options: RequeueOptions): Promise<number> {
		const { fromQueue, toExchange, routingKey, count, publishOptions } =
			options;

		const ch = await RabbitMQConnection.getConsumerChannel(
			`__dlq_requeue_${fromQueue}`,
		);
		const pubCh = await RabbitMQConnection.getPublisherChannel();

		let requeued = 0;
		const max = count ?? Number.POSITIVE_INFINITY;

		while (requeued < max) {
			const raw = await ch.get(fromQueue, { noAck: false });
			if (!raw) break;

			try {
				const pubOpts = this.buildPublishOpts(raw, publishOptions);

				await new Promise<void>((resolve, reject) => {
					pubCh.publish(toExchange, routingKey, raw.content, pubOpts, (err) => {
						if (err) reject(err);
						else resolve();
					});
				});

				ch.ack(raw);
				requeued++;
			} catch (err: any) {
				// Put the message back so it is not lost
				ch.nack(raw, false, true);
				this.logger.error(
					`Failed to republish message from "${fromQueue}" to "${toExchange}/${routingKey}": ${err.message}`,
				);
				break;
			}
		}

		await ch.close().catch(() => {});

		this.logger.log(
			`Requeued ${requeued} message(s) from "${fromQueue}" to exchange "${toExchange}" (key: "${routingKey}")`,
		);

		return requeued;
	}

	// ─── Discard ─────────────────────────────────────────────────────────────

	/**
	 * Permanently discard messages from a Dead Letter Queue by acknowledging them
	 * without republishing.
	 *
	 * @param queue - Dead letter queue name
	 * @param count - Number of messages to discard. Omit to discard **all**.
	 * @returns Number of messages discarded
	 *
	 * @example
	 * ```typescript
	 * await this.dlq.discardMessages('orders.dlq');     // purge all
	 * await this.dlq.discardMessages('orders.dlq', 10); // discard first 10
	 * ```
	 */
	async discardMessages(queue: string, count?: number): Promise<number> {
		const ch = await RabbitMQConnection.getConsumerChannel(
			`__dlq_discard_${queue}`,
		);

		let discarded = 0;
		const max = count ?? Number.POSITIVE_INFINITY;

		while (discarded < max) {
			const raw = await ch.get(queue, { noAck: false });
			if (!raw) break;

			ch.ack(raw);
			discarded++;
		}

		await ch.close().catch(() => {});

		this.logger.log(`Discarded ${discarded} message(s) from queue "${queue}"`);
		return discarded;
	}

	// ─── Count ───────────────────────────────────────────────────────────────

	/**
	 * Returns the number of messages currently in a queue (including DLQs).
	 *
	 * @param queue - Queue name to check
	 * @returns Message count
	 *
	 * @example
	 * ```typescript
	 * const pending = await this.dlq.messageCount('orders.dlq');
	 * console.log(`${pending} failed orders waiting`);
	 * ```
	 */
	async messageCount(queue: string): Promise<number> {
		const ch = await RabbitMQConnection.getConsumerChannel(
			`__dlq_count_${queue}`,
		);

		const info = await ch.checkQueue(queue);
		await ch.close().catch(() => {});
		return info.messageCount;
	}

	// ─── Private helpers ──────────────────────────────────────────────────────

	private parsePayload<T>(raw: GetMessage): T {
		try {
			return JSON.parse(raw.content.toString("utf-8")) as T;
		} catch {
			return raw.content.toString("utf-8") as unknown as T;
		}
	}

	private extractDeathInfo(raw: GetMessage): DeadLetterDeathInfo | null {
		const xDeath = raw.properties.headers?.["x-death"];
		if (!Array.isArray(xDeath) || xDeath.length === 0) return null;

		// The most recent death record is the first entry
		const record = xDeath[0] as unknown as Record<string, unknown>;

		return {
			queue: String(record["queue"] ?? ""),
			exchange: String(record["exchange"] ?? ""),
			routingKeys: Array.isArray(record["routing-keys"])
				? (record["routing-keys"] as any[]).map(String)
				: [],
			count: Number(record["count"] ?? 1),
			reason: String(
				record["reason"] ?? "rejected",
			) as DeadLetterDeathInfo["reason"],
			time:
				record["time"] instanceof Date
					? record["time"]
					: new Date(String(record["time"] ?? Date.now())),
		};
	}

	private buildPublishOpts(
		raw: GetMessage,
		overrides?: RabbitPublishOptions,
	): Options.Publish {
		return {
			persistent: overrides?.persistent ?? raw.properties.deliveryMode === 2,
			contentType:
				overrides?.contentType ??
				raw.properties.contentType ??
				"application/json",
			contentEncoding:
				overrides?.contentEncoding ?? raw.properties.contentEncoding ?? "utf-8",
			headers: {
				...raw.properties.headers,
				...overrides?.headers,
				// Track how many times this message has been manually requeued from a DLQ
				"x-dlq-requeued":
					Number(raw.properties.headers?.["x-dlq-requeued"] ?? 0) + 1,
			},
			correlationId: overrides?.correlationId ?? raw.properties.correlationId,
			messageId: overrides?.messageId ?? raw.properties.messageId,
			priority: overrides?.priority ?? raw.properties.priority,
			expiration:
				overrides?.expiration !== undefined
					? String(overrides.expiration)
					: undefined,
		};
	}

	private buildWrapper<T>(
		ch: any,
		raw: GetMessage,
		data: T,
		deathInfo: DeadLetterDeathInfo | null,
		pubCh: any,
	): DeadLetterMessage<T> {
		// GetMessage and ConsumeMessage share the same structure except for the
		// consumerTag field in fields. Cast here for interface compatibility.
		const asMsg = raw as unknown as Message;
		return {
			data,
			raw: asMsg as any,
			deathInfo,
			ack: () => ch.ack(raw),
			nack: (requeue = false) => ch.nack(raw, false, requeue),
			republish: async (
				exchange: string,
				routingKey: string,
				options?: RabbitPublishOptions,
			) => {
				const pubOpts = this.buildPublishOpts(raw, options);
				await new Promise<void>((resolve, reject) => {
					pubCh.publish(
						exchange,
						routingKey,
						raw.content,
						pubOpts,
						(err: Error | null) => {
							if (err) reject(err);
							else resolve();
						},
					);
				});
			},
		};
	}
}
