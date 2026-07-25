import type { ConfirmChannel, ConsumeMessage, Options } from "amqplib";
import { instrumentConsume } from "@/observability/instrumentation";
import {
	getInstruments,
	registerConsumerState,
	unregisterConsumerState,
} from "@/observability/metrics";
import { Logger } from "@/utils/logger";
import {
	CircuitBreaker,
	type CircuitBreakerOptions,
	CircuitOpenError,
} from "./circuit-breaker";
import { PUBLISH_ID_HEADER, publishConfirmed } from "./publish";
import { backoffDelay, type RetryOptions, shouldRetry } from "./retry";
import { declareRetryTopology, retryDelays, retryQueueName } from "./topology";
import type { RabbitMessage } from "./types";

const RECONSUME_DELAY_MS = 1000;
const CIRCUIT_STATES: Record<string, number> = {
	closed: 0,
	"half-open": 1,
	open: 2,
};
const HOP_FAILURE_PAUSE_MS = 5000;

export interface QueueConsumerOptions {
	queue: string;
	handle: (message: RabbitMessage) => Promise<void>;
	retry?: RetryOptions;
	deadLetterQueue?: string;
	/** True when the queue is not declared by the module topology. */
	declareQueue?: boolean;
	breaker?: CircuitBreakerOptions;
}

interface FailureTarget {
	queue: string;
	headers: Record<string, unknown>;
}

/**
 * Consumes a single queue on its own channel.
 *
 * A message is only acknowledged once its replacement is safely on the broker,
 * so a crash at any point leaves the message either unacked or already parked
 * in a retry queue. Nothing lives in process memory between attempts.
 */
export class QueueConsumer {
	private channel?: ConfirmChannel;
	private consumerTag?: string;
	private paused = false;
	private stopped = false;
	private resumeTimer?: ReturnType<typeof setTimeout>;
	private readonly inFlight = new Set<Promise<void>>();
	private readonly breaker: CircuitBreaker;
	private readonly logger = new Logger("Rabbit");

	constructor(private readonly options: QueueConsumerOptions) {
		this.breaker = new CircuitBreaker(options.breaker);
	}

	get queue(): string {
		return this.options.queue;
	}

	/**
	 * Always defined: without somewhere to put an exhausted message the broker
	 * would drop it, so one is provisioned per queue when none is configured.
	 */
	get deadLetterQueue(): string {
		return this.options.deadLetterQueue ?? `${this.options.queue}.dlq`;
	}

	/** Binds the consumer to a freshly established channel. */
	async attach(channel: ConfirmChannel): Promise<void> {
		registerConsumerState(this, this.queue, () => ({
			circuit: CIRCUIT_STATES[this.breaker.current] ?? 0,
			paused: this.paused,
			inFlight: this.inFlight.size,
		}));
		if (this.stopped) return;
		this.clearResumeTimer();
		this.channel = channel;
		this.consumerTag = undefined;
		// an open circuit means the downstream is still down: reconnecting must
		// not resume consumption behind its back, but it must still be scheduled
		// to come back, or the queue would stall for the life of the connection
		this.paused = this.breaker.current === "open";

		if (this.options.declareQueue) {
			await channel.assertQueue(this.queue, { durable: true });
		}
		await channel.assertQueue(this.deadLetterQueue, { durable: true });
		await declareRetryTopology(channel, this.queue, this.options.retry);

		if (this.paused) {
			this.scheduleResume(this.breaker.msUntilHalfOpen());
			return;
		}
		await this.consume();
	}

	/** Drops the reference to a channel that is already gone. */
	detach(): void {
		this.clearResumeTimer();
		this.channel = undefined;
		this.consumerTag = undefined;
		this.paused = false;
	}

	/** Stops new deliveries while leaving in-flight handlers running. */
	async cancel(): Promise<void> {
		const channel = this.channel;
		const tag = this.consumerTag;
		this.consumerTag = undefined;
		if (!channel || !tag) return;
		try {
			await channel.cancel(tag);
		} catch {
			// channel already gone; the broker requeues anything unacked
		}
	}

	/** Waits for in-flight handlers, giving up after `timeoutMs`. */
	async drain(timeoutMs: number): Promise<void> {
		if (this.inFlight.size === 0) return;
		const pending = Promise.allSettled([...this.inFlight]);
		await Promise.race([pending, Bun.sleep(timeoutMs)]);
		if (this.inFlight.size > 0) {
			this.logger.warn(
				`${this.inFlight.size} in-flight message(s) on "${this.queue}" did not finish before the shutdown timeout; they will be redelivered.`,
			);
		}
	}

	async close(timeoutMs: number): Promise<void> {
		// sticky: a reconnect racing shutdown must not resurrect this consumer
		this.stopped = true;
		unregisterConsumerState(this);
		this.clearResumeTimer();
		await this.cancel();
		await this.drain(timeoutMs);
	}

	private async consume(): Promise<void> {
		const channel = this.channel;
		if (!channel || this.consumerTag || this.paused || this.stopped) return;

		const { consumerTag } = await channel.consume(this.queue, (raw) => {
			if (!raw) {
				// cancelled by the broker (queue deleted, node failover): without
				// this the consumer would stop forever while reporting healthy
				this.consumerTag = undefined;
				this.logger.warn(
					`Consumption of "${this.queue}" was cancelled by the broker; re-registering.`,
				);
				this.scheduleReconsume();
				return;
			}
			const task = this.dispatch(channel, raw).finally(() => {
				this.inFlight.delete(task);
			});
			this.inFlight.add(task);
		});
		this.consumerTag = consumerTag;
	}

	private async dispatch(
		channel: ConfirmChannel,
		raw: ConsumeMessage,
	): Promise<void> {
		const attempt = readAttempt(raw);
		// the publish correlation id is framework plumbing, not application data
		if (raw.properties.headers)
			delete raw.properties.headers[PUBLISH_ID_HEADER];
		const message: RabbitMessage = { data: decode(raw), raw, attempt };

		try {
			await instrumentConsume(this.queue, attempt, raw.properties.headers, () =>
				this.breaker.execute(() => this.options.handle(message)),
			);
			this.settle(() => channel.ack(raw));
		} catch (error) {
			if (error instanceof CircuitOpenError) {
				// the handler never ran, so the message keeps its attempt count
				this.settle(() => channel.nack(raw, false, true));
				this.pause();
				return;
			}
			await this.handleFailure(channel, raw, attempt, error);
			if (this.breaker.current === "open") this.pause();
		}
	}

	private async handleFailure(
		channel: ConfirmChannel,
		raw: ConsumeMessage,
		attempt: number,
		error: unknown,
	): Promise<void> {
		const target = this.failureTarget(attempt, error);

		const { retried, deadLettered } = getInstruments();

		try {
			await publishConfirmed(
				channel,
				target.queue,
				{ mandatory: true },
				(headers, mandatory, callback) =>
					channel.sendToQueue(
						target.queue,
						raw.content,
						{
							...forwardable(raw.properties),
							persistent: true,
							mandatory,
							headers: {
								...raw.properties.headers,
								...target.headers,
								...headers,
							},
						},
						callback,
					),
			);
			if (target.queue === this.deadLetterQueue) {
				deadLettered.add(1, { queue: this.queue });
			} else {
				retried.add(1, { queue: this.queue });
			}
			this.settle(() => channel.ack(raw));
		} catch (publishError) {
			// requeueing alone would spin: the same hop fails again immediately.
			// Pausing throttles the retry and keeps the message on the broker.
			this.logger.error(
				`Could not move a message from "${this.queue}" to "${target.queue}"; leaving it on the queue.`,
				publishError,
			);
			this.pause(HOP_FAILURE_PAUSE_MS);
			this.settle(() => channel.nack(raw, false, true));
		}
	}

	private failureTarget(attempt: number, error: unknown): FailureTarget {
		if (shouldRetry(attempt, this.options.retry)) {
			// only a bounded number of retry queues is declared, so an attempt
			// past the last one reuses it instead of publishing into the void
			const delays = retryDelays(this.options.retry);
			const delay =
				delays[Math.min(attempt - 1, delays.length - 1)] ??
				backoffDelay(attempt, this.options.retry);
			return {
				queue: retryQueueName(this.queue, delay),
				headers: { "x-attempt": attempt + 1 },
			};
		}
		return {
			queue: this.deadLetterQueue,
			headers: { "x-attempt": attempt, "x-error": String(error) },
		};
	}

	/**
	 * An open circuit means the downstream is down, so the queue stops being
	 * consumed until the cooldown elapses. Messages stay on the broker instead
	 * of being burned through their retries against a dependency that is gone.
	 */
	private pause(waitMs = this.breaker.msUntilHalfOpen()): void {
		if (this.paused || this.stopped) return;
		this.paused = true;
		this.logger.warn(`Pausing consumption of "${this.queue}" for ${waitMs}ms.`);
		void this.cancel();
		this.scheduleResume(waitMs);
	}

	/** Single-slot, so a pause and a re-consume can never stack timers. */
	private scheduleResume(waitMs: number): void {
		this.clearResumeTimer();
		if (this.stopped) return;
		this.resumeTimer = setTimeout(() => {
			this.resumeTimer = undefined;
			void this.resume();
		}, waitMs);
	}

	/** Re-registers after a broker-side cancel, retrying while it keeps failing. */
	private scheduleReconsume(): void {
		this.scheduleResume(RECONSUME_DELAY_MS);
	}

	private async resume(): Promise<void> {
		this.resumeTimer = undefined;
		this.paused = false;
		try {
			await this.consume();
			this.logger.log(`Resumed consumption of "${this.queue}".`);
		} catch (error) {
			// the channel is gone; reconnection re-attaches this consumer
			this.logger.warn(
				`Could not resume consumption of "${this.queue}":`,
				error,
			);
		}
	}

	/** Acks and nacks throw on a dead channel; the broker redelivers instead. */
	private settle(action: () => void): void {
		try {
			action();
		} catch {
			// channel closed mid-handler; the message stays unacked on the broker
		}
	}

	private clearResumeTimer(): void {
		if (this.resumeTimer) clearTimeout(this.resumeTimer);
		this.resumeTimer = undefined;
	}
}

/** Keeps the original envelope minus the fields we set ourselves. */
function forwardable(
	properties: ConsumeMessage["properties"],
): Options.Publish {
	const { headers: _headers, deliveryMode: _mode, ...rest } = properties;
	return rest as Options.Publish;
}

function readAttempt(raw: ConsumeMessage): number {
	const value = Number(raw.properties.headers?.["x-attempt"] ?? 1);
	return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function decode(raw: ConsumeMessage): unknown {
	try {
		return JSON.parse(raw.content.toString());
	} catch {
		return raw.content.toString();
	}
}
