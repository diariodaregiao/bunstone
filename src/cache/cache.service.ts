import type { RedisClient } from "bun";
import { Inject, Injectable } from "@/core/injectable";
import type { OnModuleDestroy } from "@/core/lifecycle";
import { CACHE_CLIENT, type CacheSetOptions } from "./cache.tokens";

@Injectable()
export class CacheService implements OnModuleDestroy {
	constructor(@Inject(CACHE_CLIENT) private readonly redis: RedisClient) {}

	get client(): RedisClient {
		return this.redis;
	}

	async get<T>(key: string): Promise<T | null> {
		const raw = await this.redis.get(key);
		return raw === null ? null : (JSON.parse(raw) as T);
	}

	/**
	 * Stores `value` as JSON. Values that JSON cannot represent (`undefined`, a
	 * function, a symbol) are stored as `null` and read back as `null`. A
	 * `ttlSeconds` of `0` or less means "already expired" and removes the key.
	 */
	async set(
		key: string,
		value: unknown,
		options: CacheSetOptions = {},
	): Promise<void> {
		const encoded = JSON.stringify(value);
		const payload = encoded === undefined ? "null" : encoded;
		const ttl = options.ttlSeconds;
		if (ttl === undefined) {
			await this.redis.set(key, payload);
		} else if (ttl > 0) {
			await this.redis.set(key, payload, "EX", ttl);
		} else {
			await this.redis.del(key);
		}
	}

	has(key: string): Promise<boolean> {
		return this.redis.exists(key);
	}

	async delete(key: string): Promise<void> {
		await this.redis.del(key);
	}

	async getOrSet<T>(
		key: string,
		factory: () => T | Promise<T>,
		options: CacheSetOptions = {},
	): Promise<T> {
		// A stored JSON `null` is a cached value, not a miss, so negative results
		// are cached too; only an absent key runs the factory.
		const raw = await this.redis.get(key);
		if (raw !== null) return JSON.parse(raw) as T;
		const value = await factory();
		await this.set(key, value, options);
		return value;
	}

	onModuleDestroy(): void {
		this.redis.close();
	}
}
