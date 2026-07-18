import type { RedisClient } from "bun";
import { InjectionToken } from "@/core/injectable";

export interface CacheOptions {
	url?: string;
}

export interface CacheSetOptions {
	ttlSeconds?: number;
}

export const CACHE_CLIENT = new InjectionToken<RedisClient>("CacheClient");
