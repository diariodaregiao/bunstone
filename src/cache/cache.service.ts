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

	async set(
		key: string,
		value: unknown,
		options: CacheSetOptions = {},
	): Promise<void> {
		const payload = JSON.stringify(value);
		if (options.ttlSeconds) {
			await this.redis.set(key, payload, "EX", options.ttlSeconds);
		} else {
			await this.redis.set(key, payload);
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
		const cached = await this.get<T>(key);
		if (cached !== null) return cached;
		const value = await factory();
		await this.set(key, value, options);
		return value;
	}

	onModuleDestroy(): void {
		this.redis.close();
	}
}
