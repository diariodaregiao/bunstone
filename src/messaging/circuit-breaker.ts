export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
	failureThreshold?: number;
	cooldownMs?: number;
	successThreshold?: number;
	now?: () => number;
}

export class CircuitOpenError extends Error {
	constructor() {
		super("Circuit breaker is open.");
		this.name = "CircuitOpenError";
	}
}

export class CircuitBreaker {
	private state: CircuitState = "closed";
	private failures = 0;
	private successes = 0;
	private openedAt = 0;

	private readonly failureThreshold: number;
	private readonly cooldownMs: number;
	private readonly successThreshold: number;
	private readonly now: () => number;

	constructor(options: CircuitBreakerOptions = {}) {
		this.failureThreshold = options.failureThreshold ?? 5;
		this.cooldownMs = options.cooldownMs ?? 10_000;
		this.successThreshold = options.successThreshold ?? 1;
		this.now = options.now ?? Date.now;
	}

	get current(): CircuitState {
		if (
			this.state === "open" &&
			this.now() - this.openedAt >= this.cooldownMs
		) {
			this.state = "half-open";
			this.successes = 0;
		}
		return this.state;
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.current === "open") throw new CircuitOpenError();
		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		if (this.state === "half-open") {
			this.successes++;
			if (this.successes >= this.successThreshold) this.close();
		} else {
			this.failures = 0;
		}
	}

	private onFailure(): void {
		if (this.state === "half-open") {
			this.open();
			return;
		}
		this.failures++;
		if (this.failures >= this.failureThreshold) this.open();
	}

	private open(): void {
		this.state = "open";
		this.openedAt = this.now();
	}

	private close(): void {
		this.state = "closed";
		this.failures = 0;
		this.successes = 0;
	}
}
