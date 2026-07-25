import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type { RedisClient } from "bun";
import { CacheService } from "@/cache/cache.service";

/** Rejects the same inputs a real Redis server rejects. */
class FakeRedis {
	readonly store = new Map<string, string>();

	async get(key: string): Promise<string | null> {
		return this.store.get(key) ?? null;
	}

	async set(key: string, value: string, mode?: string, ttl?: number) {
		if (typeof value !== "string") throw new Error("value must be a string");
		if (mode === "EX" && (!Number.isInteger(ttl) || (ttl ?? 0) <= 0)) {
			throw new Error("ERR value is not an integer or out of range");
		}
		this.store.set(key, value);
	}

	async del(key: string) {
		this.store.delete(key);
	}

	async exists(key: string) {
		return this.store.has(key);
	}

	close() {}

	asClient(): RedisClient {
		return this as unknown as RedisClient;
	}
}

function service() {
	const redis = new FakeRedis();
	return { redis, cache: new CacheService(redis.asClient()) };
}

describe("CacheService hardening", () => {
	it("ignores a non-finite ttl instead of deleting the value", async () => {
		const { cache } = service();
		await cache.set("k", { v: 1 });

		await cache.set("k", { v: 1 }, { ttlSeconds: Number.NaN });

		expect(await cache.get<{ v: number }>("k")).toEqual({ v: 1 });
	});

	it("rounds a fractional ttl down to an integer", async () => {
		const { cache } = service();

		await cache.set("k", "x", { ttlSeconds: 1.9 });

		expect(await cache.get<string>("k")).toBe("x");
	});

	it("treats a value it did not write as a miss", async () => {
		const { redis, cache } = service();
		redis.store.set("k", "not json at all");

		expect(await cache.get("k")).toBeNull();
	});

	it("recomputes instead of throwing forever on a corrupted value", async () => {
		const { redis, cache } = service();
		redis.store.set("k", "not json at all");

		expect(await cache.getOrSet<string>("k", () => "fresh")).toBe("fresh");
		expect(await cache.get<string>("k")).toBe("fresh");
	});

	it("still caches a null result exactly once", async () => {
		const { cache } = service();
		let calls = 0;
		const factory = () => {
			calls++;
			return null;
		};

		expect(await cache.getOrSet("k", factory)).toBeNull();
		expect(await cache.getOrSet("k", factory)).toBeNull();
		expect(calls).toBe(1);
	});
});
