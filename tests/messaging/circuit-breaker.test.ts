import { describe, expect, it } from "bun:test";
import { CircuitBreaker, CircuitOpenError } from "@/messaging/circuit-breaker";

function fakeClock(start = 0) {
	let time = start;
	return {
		now: () => time,
		advance: (ms: number) => {
			time += ms;
		},
	};
}

const fail = () => Promise.reject(new Error("nope"));
const ok = () => Promise.resolve("ok");

describe("CircuitBreaker", () => {
	it("opens after the failure threshold", async () => {
		const breaker = new CircuitBreaker({ failureThreshold: 3, now: () => 0 });
		for (let i = 0; i < 3; i++) {
			await expect(breaker.execute(fail)).rejects.toThrow("nope");
		}
		expect(breaker.current).toBe("open");
		await expect(breaker.execute(ok)).rejects.toBeInstanceOf(CircuitOpenError);
	});

	it("moves to half-open after the cooldown", async () => {
		const clock = fakeClock();
		const breaker = new CircuitBreaker({
			failureThreshold: 1,
			cooldownMs: 1000,
			now: clock.now,
		});
		await expect(breaker.execute(fail)).rejects.toThrow();
		expect(breaker.current).toBe("open");

		clock.advance(1000);
		expect(breaker.current).toBe("half-open");
	});

	it("closes again after a success in half-open", async () => {
		const clock = fakeClock();
		const breaker = new CircuitBreaker({
			failureThreshold: 1,
			cooldownMs: 1000,
			successThreshold: 1,
			now: clock.now,
		});
		await expect(breaker.execute(fail)).rejects.toThrow();
		clock.advance(1000);
		expect(await breaker.execute(ok)).toBe("ok");
		expect(breaker.current).toBe("closed");
	});

	it("re-opens on a failure while half-open", async () => {
		const clock = fakeClock();
		const breaker = new CircuitBreaker({
			failureThreshold: 1,
			cooldownMs: 1000,
			now: clock.now,
		});
		await expect(breaker.execute(fail)).rejects.toThrow();
		clock.advance(1000);
		expect(breaker.current).toBe("half-open");
		await expect(breaker.execute(fail)).rejects.toThrow("nope");
		expect(breaker.current).toBe("open");
	});

	it("resets the failure count after a success", async () => {
		const breaker = new CircuitBreaker({ failureThreshold: 3, now: () => 0 });
		await expect(breaker.execute(fail)).rejects.toThrow();
		await expect(breaker.execute(fail)).rejects.toThrow();
		expect(await breaker.execute(ok)).toBe("ok");
		await expect(breaker.execute(fail)).rejects.toThrow();
		expect(breaker.current).toBe("closed");
	});
});
