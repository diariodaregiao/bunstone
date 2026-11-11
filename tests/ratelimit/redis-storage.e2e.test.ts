import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { RedisClient } from "bun";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit } from "@/ratelimit/decorator";
import { RedisStorage } from "@/ratelimit/redis-storage";
import { REDIS_URL, redisReachable } from "../support/services";

const reachable = await redisReachable();
const prefix = `bunstone:test:rl:${crypto.randomUUID()}:`;

@Controller("limited")
class LimitedController {
	@Get()
	@RateLimit({ max: 2, windowMs: 5_000 })
	hit() {
		return { ok: true };
	}
}

@Module({ controllers: [LimitedController] })
class AppModule {}

describe.skipIf(!reachable)("RedisStorage", () => {
	let client: RedisClient;

	beforeAll(() => {
		client = new RedisClient(REDIS_URL);
	});

	afterAll(async () => {
		const keys = (await client.send("KEYS", [`${prefix}*`])) as string[];
		if (keys.length > 0) await client.send("DEL", keys);
		client.close();
	});

	it("counts within a window and sets an expiry", async () => {
		const storage = new RedisStorage({ client, prefix });
		const first = await storage.hit("k1", 2, 10_000);
		const second = await storage.hit("k1", 2, 10_000);
		const third = await storage.hit("k1", 2, 10_000);

		expect([first.allowed, second.allowed, third.allowed]).toEqual([
			true,
			true,
			false,
		]);
		expect(third.remaining).toBe(0);
		expect(third.resetAt).toBeGreaterThan(Date.now());
		const ttl = (await client.send("PTTL", [`${prefix}k1`])) as number;
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(10_000);
	});

	it("opens a fresh window once the previous one expires", async () => {
		const storage = new RedisStorage({ client, prefix });
		await storage.hit("k2", 1, 50);
		expect((await storage.hit("k2", 1, 50)).allowed).toBe(false);
		await Bun.sleep(80);
		expect((await storage.hit("k2", 1, 50)).allowed).toBe(true);
	});

	it("shares counters between instances, as replicas would", async () => {
		const a = new RedisStorage({ client, prefix });
		const b = new RedisStorage({ url: REDIS_URL, prefix });
		await a.hit("k3", 2, 10_000);
		await b.hit("k3", 2, 10_000);
		expect((await a.hit("k3", 2, 10_000)).allowed).toBe(false);
		b.close();
	});

	it("does not close a client it was handed", async () => {
		const storage = new RedisStorage({ client, prefix });
		storage.close();
		expect(await client.send("PING", [])).toBe("PONG");
	});

	it("enforces @RateLimit through the application", async () => {
		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimitStorage: new RedisStorage({ client, prefix }),
		});
		app.listen(0);
		const url = `${app.getServer()?.url.href}limited`;
		const statuses: number[] = [];
		for (let i = 0; i < 3; i++) statuses.push((await fetch(url)).status);
		await app.close();
		expect(statuses).toEqual([200, 200, 429]);
	});
});
