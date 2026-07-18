export interface RetryOptions {
	maxAttempts?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	factor?: number;
}

export const DEFAULT_RETRY: Required<RetryOptions> = {
	maxAttempts: 3,
	baseDelayMs: 200,
	maxDelayMs: 30_000,
	factor: 2,
};

export function backoffDelay(
	attempt: number,
	options: RetryOptions = {},
): number {
	const base = options.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs;
	const factor = options.factor ?? DEFAULT_RETRY.factor;
	const max = options.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs;
	return Math.min(max, base * factor ** Math.max(0, attempt - 1));
}

export function shouldRetry(
	attempt: number,
	options: RetryOptions = {},
): boolean {
	return attempt < (options.maxAttempts ?? DEFAULT_RETRY.maxAttempts);
}
