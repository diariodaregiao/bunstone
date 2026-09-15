import type { RedisClient } from "bun";
import { RateLimitError } from "@/errors";
import { Logger } from "@/utils/logger";
import type { RateLimitResult, RateLimitStorage } from "./storage";

const logger = new Logger("RateLimit");

export type RedisStorageFailureMode = "allow" | "reject";

export interface RedisStorageOptions {
	client: RedisClient;
	keyPrefix?: string;
	onFailure?: RedisStorageFailureMode;
}

export class RedisStorage implements RateLimitStorage {
	private readonly prefix: string;
	private readonly onFailure: RedisStorageFailureMode;

	constructor(private readonly options: RedisStorageOptions) {
		this.prefix = options.keyPrefix ?? "bunstone:ratelimit:";
		this.onFailure = options.onFailure ?? "allow";
	}

	async hit(
		key: string,
		max: number,
		windowMs: number,
	): Promise<RateLimitResult> {
		const redisKey = `${this.prefix}${key}`;
		try {
			const count = await this.options.client.incr(redisKey);
			if (count === 1) {
				await this.options.client.pexpire(redisKey, windowMs);
			}
			const ttl = await this.options.client.pttl(redisKey);
			const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
			return {
				allowed: count <= max,
				limit: max,
				remaining: Math.max(0, max - count),
				resetAt,
			};
		} catch (error) {
			if (this.onFailure === "reject") {
				throw RateLimitError.storageFailed(
					error instanceof Error ? error : undefined,
				);
			}
			logger.warn("Redis rate limit storage failed; allowing request.", {
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				allowed: true,
				limit: max,
				remaining: max,
				resetAt: Date.now() + windowMs,
			};
		}
	}

	close(): void {
		this.options.client.close();
	}
}
