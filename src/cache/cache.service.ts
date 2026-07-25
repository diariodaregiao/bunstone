import type { RedisClient } from "bun";
import { Inject, Injectable } from "@/core/injectable";
import type { OnModuleDestroy } from "@/core/lifecycle";
import { Logger } from "@/utils/logger";
import { CACHE_CLIENT, type CacheSetOptions } from "./cache.tokens";

const logger = new Logger("Cache");

@Injectable()
export class CacheService implements OnModuleDestroy {
	constructor(@Inject(CACHE_CLIENT) private readonly redis: RedisClient) {}

	get client(): RedisClient {
		return this.redis;
	}

	async get<T>(key: string): Promise<T | null> {
		return decode<T>(await this.redis.get(key));
	}

	/**
	 * Stores `value` as JSON. Values that JSON cannot represent (`undefined`, a
	 * function, a symbol) are stored as `null` and read back as `null`. A
	 * `ttlSeconds` of `0` or less means "already expired" and removes the key;
	 * a fractional TTL is rounded to whole seconds, with any positive value
	 * kept alive for at least one second.
	 */
	async set(
		key: string,
		value: unknown,
		options: CacheSetOptions = {},
	): Promise<void> {
		const encoded = JSON.stringify(value);
		const payload = encoded === undefined ? "null" : encoded;
		const ttl = normalizeTtl(options.ttlSeconds);
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
		if (raw !== null) {
			try {
				return JSON.parse(raw) as T;
			} catch {
				// something else wrote this key: recompute instead of throwing forever
				logger.warn(
					`Cached value for "${key}" is not valid JSON; recomputing.`,
				);
			}
		}
		const value = await factory();
		await this.set(key, value, options);
		return value;
	}

	onModuleDestroy(): void {
		this.redis.close();
	}
}

function decode<T>(raw: string | null): T | null {
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		// a value this service did not write should not poison every read
		logger.warn("Cached value is not valid JSON; treating it as a miss.");
		return null;
	}
}

/**
 * Redis only accepts an integer TTL. A computed TTL can arrive as `NaN` or a
 * fraction, and silently turning `NaN` into a delete would lose the value.
 */
function normalizeTtl(ttlSeconds: number | undefined): number | undefined {
	if (ttlSeconds === undefined) return undefined;
	if (!Number.isFinite(ttlSeconds)) {
		logger.warn(`Ignoring a non-finite ttlSeconds (${ttlSeconds}).`);
		return undefined;
	}
	// Redis needs whole seconds; rounding a sub-second TTL down to 0 would turn
	// a short-lived cache entry into a delete
	return ttlSeconds > 0 ? Math.max(1, Math.floor(ttlSeconds)) : 0;
}
