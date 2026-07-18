import { describe, expect, it } from "bun:test";
import { backoffDelay, shouldRetry } from "@/messaging/retry";

describe("retry policy", () => {
	it("grows the delay exponentially", () => {
		const opts = { baseDelayMs: 100, factor: 2 };
		expect(backoffDelay(1, opts)).toBe(100);
		expect(backoffDelay(2, opts)).toBe(200);
		expect(backoffDelay(3, opts)).toBe(400);
	});

	it("caps the delay at maxDelayMs", () => {
		expect(
			backoffDelay(10, { baseDelayMs: 100, factor: 2, maxDelayMs: 1000 }),
		).toBe(1000);
	});

	it("retries until maxAttempts is reached", () => {
		const opts = { maxAttempts: 3 };
		expect(shouldRetry(1, opts)).toBe(true);
		expect(shouldRetry(2, opts)).toBe(true);
		expect(shouldRetry(3, opts)).toBe(false);
	});
});
