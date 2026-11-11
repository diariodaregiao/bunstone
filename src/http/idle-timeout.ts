import { ConfigurationError } from "@/errors";

/** Default idle time before the server closes a connection (milliseconds). */
export const DEFAULT_IDLE_TIMEOUT_MS = 10_000;

/** Bun.serve accepts idle timeouts of at most 255 seconds. */
export const MAX_IDLE_TIMEOUT_MS = 255_000;

export function resolveIdleTimeout(idleTimeout?: number): number {
	if (idleTimeout === undefined) {
		return DEFAULT_IDLE_TIMEOUT_MS;
	}
	if (
		typeof idleTimeout !== "number" ||
		!Number.isInteger(idleTimeout) ||
		idleTimeout < 0
	) {
		throw new ConfigurationError(
			"`idleTimeout` must be a non-negative integer.",
			"BNS-CFG-001",
			"Pass a whole number of milliseconds, for example `idleTimeout: 10000`, or `0` to disable the timeout.",
			{ idleTimeout },
		);
	}
	if (idleTimeout > MAX_IDLE_TIMEOUT_MS) {
		throw new ConfigurationError(
			"`idleTimeout` cannot exceed 255 seconds (255000 milliseconds).",
			"BNS-CFG-001",
			"Pass a value up to `255000`, or omit it to use the default of 10000.",
			{ idleTimeout },
		);
	}
	return idleTimeout;
}

/**
 * Converts the application option (ms) to the seconds Bun.serve expects.
 * `0` is passed through: since Bun 1.4.4 it disables the timeout.
 */
export function idleTimeoutForBunServe(idleTimeoutMs: number): number {
	if (idleTimeoutMs === 0) return 0;
	return Math.max(1, Math.ceil(idleTimeoutMs / 1000));
}
