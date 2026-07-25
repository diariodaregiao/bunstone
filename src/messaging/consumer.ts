import type { ConfirmChannel, ConsumeMessage, Options } from "amqplib";
import { Logger } from "@/utils/logger";
import {
	CircuitBreaker,
	type CircuitBreakerOptions,
	CircuitOpenError,
} from "./circuit-breaker";
import { backoffDelay, type RetryOptions, shouldRetry } from "./retry";
import { declareRetryTopology, retryQueueName } from "./topology";
import type { RabbitMessage } from "./types";

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

	/** Binds the consumer to a freshly established channel. */
	async attach(channel: ConfirmChannel): Promise<void> {
		this.clearResumeTimer();
		this.channel = channel;
		this.consumerTag = undefined;
		this.paused = false;

		if (this.options.declareQueue) {
			await channel.assertQueue(this.queue, { durable: true });
		}
		if (this.options.deadLetterQueue) {
			await channel.assertQueue(this.options.deadLetterQueue, {
				durable: true,
			});
		}
		await declareRetryTopology(channel, this.queue, this.options.retry);
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
		this.clearResumeTimer();
		await this.cancel();
		await this.drain(timeoutMs);
	}

	private async consume(): Promise<void> {
		const channel = this.channel;
		if (!channel || this.consumerTag || this.paused) return;

		const { consumerTag } = await channel.consume(this.queue, (raw) => {
			if (!raw) {
				// cancelled by the broker (queue deleted, node failover)
				this.consumerTag = undefined;
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
		const message: RabbitMessage = { data: decode(raw), raw, attempt };

		try {
			await this.breaker.execute(() => this.options.handle(message));
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

		if (!target) {
			this.logger.error(
				`Message on "${this.queue}" failed after ${attempt} attempt(s) and no dead-letter queue is configured; dropping it.`,
				error,
			);
			this.settle(() => channel.ack(raw));
			return;
		}

		try {
			await publishConfirmed(channel, target.queue, raw.content, {
				...forwardable(raw.properties),
				persistent: true,
				headers: { ...raw.properties.headers, ...target.headers },
			});
			this.settle(() => channel.ack(raw));
		} catch (publishError) {
			this.logger.error(
				`Could not move a message from "${this.queue}" to "${target.queue}"; leaving it on the queue.`,
				publishError,
			);
			this.settle(() => channel.nack(raw, false, true));
		}
	}

	private failureTarget(attempt: number, error: unknown): FailureTarget | null {
		if (shouldRetry(attempt, this.options.retry)) {
			const delay = backoffDelay(attempt, this.options.retry);
			return {
				queue: retryQueueName(this.queue, delay),
				headers: { "x-attempt": attempt + 1 },
			};
		}
		if (!this.options.deadLetterQueue) return null;
		return {
			queue: this.options.deadLetterQueue,
			headers: { "x-attempt": attempt, "x-error": String(error) },
		};
	}

	/**
	 * An open circuit means the downstream is down, so the queue stops being
	 * consumed until the cooldown elapses. Messages stay on the broker instead
	 * of being burned through their retries against a dependency that is gone.
	 */
	private pause(): void {
		if (this.paused) return;
		this.paused = true;
		const wait = this.breaker.msUntilHalfOpen();
		this.logger.warn(
			`Circuit open for "${this.queue}"; pausing consumption for ${wait}ms.`,
		);
		void this.cancel();
		this.resumeTimer = setTimeout(() => void this.resume(), wait);
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

function publishConfirmed(
	channel: ConfirmChannel,
	queue: string,
	content: Buffer,
	options: Options.Publish,
): Promise<void> {
	return new Promise((resolve, reject) => {
		channel.sendToQueue(queue, content, options, (error) =>
			error ? reject(error) : resolve(),
		);
	});
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
