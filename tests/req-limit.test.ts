import { describe, expect, test } from "bun:test";
import type { ReqLimitOptions } from "../lib/req-limit";
import { ReqLimit, rateLimitStore } from "../lib/req-limit";

describe("ReqLimit Store", () => {
	test("should allow requests within limit", () => {
		const identifier = "test-ip-1";
		const ttl = 1000;
		const limit = 3;

		// Make 3 requests (within limit)
		for (let i = 0; i < 3; i++) {
			const allowed = rateLimitStore.check(identifier, ttl, limit);
			expect(allowed).toBe(true);
		}
	});

	test("should block requests exceeding limit", () => {
		const identifier = "test-ip-2";
		const ttl = 1000;
		const limit = 3;

		// Make 3 requests (within limit)
		for (let i = 0; i < 3; i++) {
			rateLimitStore.check(identifier, ttl, limit);
		}

		// 4th request should be blocked
		const blocked = rateLimitStore.check(identifier, ttl, limit);
		expect(blocked).toBe(false);
	});

	test("should track different identifiers separately", () => {
		const ttl = 1000;
		const limit = 2;

		// IP 1: exhaust limit
		rateLimitStore.check("ip-1", ttl, limit);
		rateLimitStore.check("ip-1", ttl, limit);
		const ip1Blocked = rateLimitStore.check("ip-1", ttl, limit);
		expect(ip1Blocked).toBe(false);

		// IP 2: should still be allowed
		const ip2Allowed = rateLimitStore.check("ip-2", ttl, limit);
		expect(ip2Allowed).toBe(true);
	});

	test("should reset after TTL expires", async () => {
		const identifier = "test-ip-reset";
		const ttl = 100; // 100ms
		const limit = 2;

		// Exhaust limit
		rateLimitStore.check(identifier, ttl, limit);
		rateLimitStore.check(identifier, ttl, limit);

		// Wait for TTL to expire
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Should be allowed again
		const allowed = rateLimitStore.check(identifier, ttl, limit);
		expect(allowed).toBe(true);
	});
});

describe("ReqLimit Decorator", () => {
	test("should store metadata on method", () => {
		const options: ReqLimitOptions = { ttl: 60000, limit: 10 };

		class TestController {
			@ReqLimit(options)
			testMethod() {}
		}

		const metadata = Reflect.getMetadata(
			"dip:req-limit",
			TestController.prototype,
			"testMethod",
		);

		expect(metadata).toEqual(options);
	});

	test("should throw error for invalid ttl", () => {
		expect(() => {
			class TestController {
				@ReqLimit({ ttl: 0, limit: 10 })
				testMethod() {}
			}
		}).toThrow("ReqLimit: ttl must be a positive number.");
	});

	test("should throw error for invalid limit", () => {
		expect(() => {
			class TestController {
				@ReqLimit({ ttl: 1000, limit: -1 })
				testMethod() {}
			}
		}).toThrow("ReqLimit: limit must be a positive number.");
	});
});

