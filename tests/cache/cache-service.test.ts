import "reflect-metadata";
import { beforeEach, describe, expect, it } from "bun:test";
import type { RedisClient } from "bun";
import { CacheService } from "@/cache/cache.service";

class FakeRedis {
	readonly store = new Map<string, string>();
	readonly ttls = new Map<string, number>();

	get(key: string): Promise<string | null> {
		return Promise.resolve(this.store.get(key) ?? null);
	}

	set(
		key: string,
		value: string,
		mode?: string,
		ttlSeconds?: number,
	): Promise<string> {
		if (typeof value !== "string") {
			return Promise.reject(new TypeError("value must be a string"));
		}
		if (mode === "EX") {
			if (!ttlSeconds || ttlSeconds <= 0) {
				return Promise.reject(new Error("ERR invalid expire time in 'set'"));
			}
			this.ttls.set(key, ttlSeconds);
		}
		this.store.set(key, value);
		return Promise.resolve("OK");
	}

	exists(key: string): Promise<boolean> {
		return Promise.resolve(this.store.has(key));
	}

	del(key: string): Promise<number> {
		this.ttls.delete(key);
		return Promise.resolve(this.store.delete(key) ? 1 : 0);
	}

	close(): void {}
}

let redis: FakeRedis;
let cache: CacheService;

beforeEach(() => {
	redis = new FakeRedis();
	cache = new CacheService(redis as unknown as RedisClient);
});

describe("CacheService.set", () => {
	it("stores undefined as a JSON null instead of throwing", async () => {
		await cache.set("k", undefined);
		expect(redis.store.get("k")).toBe("null");
		expect(await cache.get("k")).toBeNull();
	});

	it("honours ttlSeconds: 0 instead of storing forever", async () => {
		await cache.set("k", "v", { ttlSeconds: 0 });
		expect(await cache.has("k")).toBe(false);
	});

	it("applies a positive ttl", async () => {
		await cache.set("k", "v", { ttlSeconds: 30 });
		expect(redis.ttls.get("k")).toBe(30);
	});

	it("stores without a ttl when none is given", async () => {
		await cache.set("k", "v");
		expect(redis.ttls.has("k")).toBe(false);
		expect(await cache.get<string>("k")).toBe("v");
	});
});

describe("CacheService.getOrSet", () => {
	it("caches a null result and does not re-run the factory", async () => {
		let calls = 0;
		const factory = () => {
			calls++;
			return null;
		};

		expect(await cache.getOrSet("k", factory)).toBeNull();
		expect(await cache.getOrSet("k", factory)).toBeNull();
		expect(calls).toBe(1);
		expect(redis.store.get("k")).toBe("null");
	});

	it("still computes on a real miss", async () => {
		let calls = 0;
		const value = await cache.getOrSet("k", () => {
			calls++;
			return { n: 1 };
		});
		expect(value).toEqual({ n: 1 });
		expect(calls).toBe(1);
	});
});
