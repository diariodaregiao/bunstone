import "reflect-metadata";
import { afterAll, describe, expect, it } from "bun:test";
import type { RedisClient } from "bun";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { RateLimitError } from "@/errors";
import { Controller, Get } from "@/http/routing";
import { RateLimitModule } from "@/ratelimit";
import { RedisStorage } from "@/ratelimit/redis-storage";
import { REDIS_URL, redisReachable } from "../support/services";

class FakeRedis {
	private readonly counters = new Map<string, number>();
	private readonly expirations = new Map<string, number>();
	private nowMs = Date.now();

	setNow(ms: number) {
		this.nowMs = ms;
	}

	async incr(key: string): Promise<number> {
		const expires = this.expirations.get(key);
		if (expires !== undefined && this.nowMs >= expires) {
			this.counters.delete(key);
			this.expirations.delete(key);
		}
		const next = (this.counters.get(key) ?? 0) + 1;
		this.counters.set(key, next);
		return next;
	}

	async pexpire(key: string, ms: number): Promise<number> {
		this.expirations.set(key, this.nowMs + ms);
		return 1;
	}

	async pttl(key: string): Promise<number> {
		const expires = this.expirations.get(key);
		if (expires === undefined) return -1;
		return Math.max(0, expires - this.nowMs);
	}

	close() {}
}

class FailingRedis {
	async incr(): Promise<number> {
		throw new Error("connection refused");
	}

	close() {}
}

describe("RedisStorage", () => {
	it("increments atomically and enforces the limit", async () => {
		const redis = new FakeRedis();
		const storage = new RedisStorage({
			client: redis as unknown as RedisClient,
			keyPrefix: "test:",
		});

		const first = await storage.hit("k", 2, 10_000);
		expect(first.allowed).toBe(true);
		expect(first.remaining).toBe(1);

		const second = await storage.hit("k", 2, 10_000);
		expect(second.allowed).toBe(true);
		expect(second.remaining).toBe(0);

		const third = await storage.hit("k", 2, 10_000);
		expect(third.allowed).toBe(false);
		expect(third.remaining).toBe(0);
	});

	it("resets the window after expiry", async () => {
		const redis = new FakeRedis();
		const storage = new RedisStorage({
			client: redis as unknown as RedisClient,
			keyPrefix: "test:expiry:",
		});

		expect((await storage.hit("k", 1, 1_000)).allowed).toBe(true);
		expect((await storage.hit("k", 1, 1_000)).allowed).toBe(false);

		redis.setNow(Date.now() + 1_100);
		expect((await storage.hit("k", 1, 1_000)).allowed).toBe(true);
	});

	it("allows requests when Redis fails and onFailure is allow", async () => {
		const storage = new RedisStorage({
			client: new FailingRedis() as unknown as RedisClient,
			onFailure: "allow",
		});

		const result = await storage.hit("k", 1, 10_000);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(1);
	});

	it("rejects when Redis fails and onFailure is reject", async () => {
		const storage = new RedisStorage({
			client: new FailingRedis() as unknown as RedisClient,
			onFailure: "reject",
		});

		await expect(storage.hit("k", 1, 10_000)).rejects.toBeInstanceOf(
			RateLimitError,
		);
	});
});

const redisUp = await redisReachable();

describe.skipIf(!redisUp)("RedisStorage integration", () => {
	const key = `bunstone:ratelimit:test:${crypto.randomUUID()}`;
	let client: RedisClient;
	let storage: RedisStorage;

	afterAll(() => {
		storage?.close();
	});

	it("allows exactly max concurrent hits under parallel load", async () => {
		const { RedisClient: Redis } = await import("bun");
		client = new Redis(REDIS_URL);
		storage = new RedisStorage({
			client,
			keyPrefix: `${key}:`,
		});

		const results = await Promise.all(
			Array.from({ length: 50 }, () => storage.hit("parallel", 10, 60_000)),
		);
		expect(results.filter((result) => result.allowed).length).toBe(10);
		expect(results.filter((result) => !result.allowed).length).toBe(40);
	});
});

@Controller("shared")
class SharedController {
	@Get()
	hit() {
		return { ok: true };
	}
}

@Module({
	imports: [
		RateLimitModule.registerStorage({
			url: REDIS_URL,
			keyPrefix: `bunstone:ratelimit:multi:${crypto.randomUUID()}:`,
		}),
	],
	controllers: [SharedController],
})
class SharedRedisModule {}

describe.skipIf(!redisUp)("RedisStorage across application instances", () => {
	let appA: Application;
	let appB: Application;
	let baseA: string;
	let baseB: string;

	afterAll(async () => {
		await appA?.close();
		await appB?.close();
	});

	it("shares one counter between two applications", async () => {
		const options = {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: { max: 5, windowMs: 60_000 },
		};

		appA = await Application.create(SharedRedisModule, options);
		appB = await Application.create(SharedRedisModule, options);
		appA.listen(0);
		appB.listen(0);
		baseA = appA.getServer()?.url.href.replace(/\/$/, "") ?? "";
		baseB = appB.getServer()?.url.href.replace(/\/$/, "") ?? "";

		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${baseA}/shared`)).status).toBe(200);
		}
		expect((await fetch(`${baseB}/shared`)).status).toBe(429);
	});
});
