import { beforeEach, describe, expect, test } from "bun:test";
import {
	AppStartup,
	Controller,
	Get,
	MemoryStorage,
	Module,
	RateLimit,
	RateLimitService,
} from "../index";

describe("Rate Limiting", () => {
	describe("MemoryStorage", () => {
		let storage: MemoryStorage;

		beforeEach(() => {
			storage = new MemoryStorage();
		});

		test("should increment counter", () => {
			const result1 = storage.increment("key1", 60000);
			expect(result1.totalHits).toBe(1);

			const result2 = storage.increment("key1", 60000);
			expect(result2.totalHits).toBe(2);
		});

		test("should decrement counter", () => {
			storage.increment("key1", 60000);
			storage.increment("key1", 60000);
			storage.decrement("key1");

			const result = storage.increment("key1", 60000);
			expect(result.totalHits).toBe(2); // 2 + 1 - 1 = 2
		});

		test("should reset expired entries", async () => {
			storage.increment("key1", 100); // 100ms window

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 150));

			const result = storage.increment("key1", 60000);
			expect(result.totalHits).toBe(1); // Should start fresh
		});

		test("should reset key manually", () => {
			storage.increment("key1", 60000);
			storage.increment("key1", 60000);
			storage.resetKey("key1");

			const result = storage.increment("key1", 60000);
			expect(result.totalHits).toBe(1);
		});
	});

	describe("RateLimitService", () => {
		let service: RateLimitService;

		beforeEach(() => {
			service = new RateLimitService();
		});

		test("should allow requests under limit", async () => {
			const mockReq = {
				headers: {},
				ip: "127.0.0.1",
				method: "GET",
				url: "/test",
			} as any;

			const result = await service.process(mockReq, {
				max: 5,
				windowMs: 60000,
			});

			expect(result.allowed).toBe(true);
			expect(result.info.totalHits).toBe(1);
			expect(result.headers["X-RateLimit-Limit"]).toBe("5");
			expect(result.headers["X-RateLimit-Remaining"]).toBe("4");
		});

		test("should reject requests over limit", async () => {
			const mockReq = {
				headers: {},
				ip: "127.0.0.1",
				method: "GET",
				url: "/test",
			} as any;

			// Make 5 requests (at limit)
			for (let i = 0; i < 5; i++) {
				await service.process(mockReq, { max: 5, windowMs: 60000 });
			}

			// 6th request should be blocked
			const result = await service.process(mockReq, {
				max: 5,
				windowMs: 60000,
			});
			expect(result.allowed).toBe(false);
			expect(result.headers["Retry-After"]).toBeDefined();
		});

		test("should skip rate limit when skip condition is met", async () => {
			const mockReq = {
				headers: { "x-skip": "true" },
				ip: "127.0.0.1",
				method: "GET",
				url: "/test",
			} as any;

			const result = await service.process(mockReq, {
				max: 1,
				windowMs: 60000,
				skipHeader: "x-skip",
			});

			expect(result.allowed).toBe(true);
			expect(result.info.totalHits).toBe(0); // Should skip counting
		});

		test("should use custom key generator", async () => {
			const mockReq = {
				headers: { "x-user-id": "user123" },
				ip: "127.0.0.1",
				method: "GET",
				url: "/test",
			} as any;

			const keyGenerator = (req: any) => req.headers["x-user-id"] || "default";

			await service.process(mockReq, {
				max: 5,
				windowMs: 60000,
				keyGenerator,
			});

			// Different IP but same user ID should count toward same limit
			const mockReq2 = {
				headers: { "x-user-id": "user123" },
				ip: "192.168.1.1",
				method: "GET",
				url: "/test",
			} as any;

			const result = await service.process(mockReq2, {
				max: 5,
				windowMs: 60000,
				keyGenerator,
			});

			expect(result.info.totalHits).toBe(2);
		});

		test("should extract IP from X-Forwarded-For header", async () => {
			const mockReq = {
				headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
				method: "GET",
				url: "/test",
			} as any;

			const result = await service.process(mockReq, {
				max: 5,
				windowMs: 60000,
			});

			expect(result.allowed).toBe(true);
		});
	});

	describe("@RateLimit Decorator Integration", () => {
		@Controller("ratelimit-test")
		class RateLimitController {
			@Get("limited")
			@RateLimit({ max: 2, windowMs: 60000 })
			limitedEndpoint() {
				return { message: "success" };
			}

			@Get("unlimited")
			unlimitedEndpoint() {
				return { message: "always works" };
			}
		}

		@Module({
			controllers: [RateLimitController],
		})
		class RateLimitTestModule {}

		test("should apply rate limit to decorated endpoint", async () => {
			const app = await AppStartup.create(RateLimitTestModule);
			const elysia = (app as any).getElysia();

			// First request should succeed
			const res1 = await elysia.handle(
				new Request("http://localhost/ratelimit-test/limited"),
			);
			expect(res1.status).toBe(200);
			expect(res1.headers.get("X-RateLimit-Limit")).toBe("2");

			// Second request should succeed
			const res2 = await elysia.handle(
				new Request("http://localhost/ratelimit-test/limited"),
			);
			expect(res2.status).toBe(200);

			// Third request should be rate limited
			const res3 = await elysia.handle(
				new Request("http://localhost/ratelimit-test/limited"),
			);
			expect(res3.status).toBe(429);
			expect(res3.headers.get("Retry-After")).toBeDefined();
		});

		test("should not affect undecorated endpoints", async () => {
			const app = await AppStartup.create(RateLimitTestModule);
			const elysia = (app as any).getElysia();

			// Make many requests to unlimited endpoint
			for (let i = 0; i < 10; i++) {
				const res = await elysia.handle(
					new Request("http://localhost/ratelimit-test/unlimited"),
				);
				expect(res.status).toBe(200);
			}
		});
	});

	describe("Global Rate Limit Configuration", () => {
		@Controller("global-test")
		class GlobalController {
			@Get("endpoint")
			endpoint() {
				return { message: "ok" };
			}
		}

		@Module({
			controllers: [GlobalController],
		})
		class GlobalTestModule {}

		test("should apply global rate limit to all endpoints", async () => {
			const app = await AppStartup.create(GlobalTestModule, {
				rateLimit: {
					enabled: true,
					max: 3,
					windowMs: 60000,
				},
			});
			const elysia = (app as any).getElysia();

			// First 3 requests should succeed
			for (let i = 0; i < 3; i++) {
				const res = await elysia.handle(
					new Request("http://localhost/global-test/endpoint"),
				);
				expect(res.status).toBe(200);
			}

			// 4th request should be rate limited
			const res = await elysia.handle(
				new Request("http://localhost/global-test/endpoint"),
			);
			expect(res.status).toBe(429);
		});

		test("should allow disabling global rate limit", async () => {
			const app = await AppStartup.create(GlobalTestModule, {
				rateLimit: {
					enabled: false,
					max: 1,
					windowMs: 60000,
				},
			});
			const elysia = (app as any).getElysia();

			// Multiple requests should succeed
			for (let i = 0; i < 5; i++) {
				const res = await elysia.handle(
					new Request("http://localhost/global-test/endpoint"),
				);
				expect(res.status).toBe(200);
			}
		});

		test("should override global config with decorator config", async () => {
			@Controller("override-test")
			class OverrideController {
				@Get("custom")
				@RateLimit({ max: 5, windowMs: 60000 })
				customEndpoint() {
					return { message: "custom" };
				}
			}

			@Module({
				controllers: [OverrideController],
			})
			class OverrideTestModule {}

			const app = await AppStartup.create(OverrideTestModule, {
				rateLimit: {
					enabled: true,
					max: 2,
					windowMs: 60000,
				},
			});
			const elysia = (app as any).getElysia();

			// Should allow 5 requests (decorator config) instead of 2 (global config)
			for (let i = 0; i < 5; i++) {
				const res = await elysia.handle(
					new Request("http://localhost/override-test/custom"),
				);
				expect(res.status).toBe(200);
			}

			// 6th request should be blocked
			const res = await elysia.handle(
				new Request("http://localhost/override-test/custom"),
			);
			expect(res.status).toBe(429);
		});
	});

	describe("Rate Limit Headers", () => {
		@Controller("headers-test")
		class HeadersController {
			@Get("check")
			@RateLimit({ max: 10, windowMs: 60000 })
			checkHeaders() {
				return { message: "check headers" };
			}
		}

		@Module({
			controllers: [HeadersController],
		})
		class HeadersTestModule {}

		test("should include all rate limit headers", async () => {
			const app = await AppStartup.create(HeadersTestModule);
			const elysia = (app as any).getElysia();

			const res = await elysia.handle(
				new Request("http://localhost/headers-test/check"),
			);

			expect(res.status).toBe(200);
			expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
			expect(res.headers.get("X-RateLimit-Remaining")).toBe("9");
			expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
		});
	});
});
