import type { RedisClient } from "bun";
import { RateLimitError } from "@/errors";
import { Logger } from "@/utils/logger";
import type { RateLimitResult, RateLimitStorage } from "./storage";

const logger = new Logger("RateLimit");

/**
 * Count the hit and make sure the key expires, in one atomic round trip. The
 * TTL is (re)applied whenever the key has none, not only on the first hit: if
 * that write were ever lost the key would never expire and the client would
 * be rejected until someone deleted it by hand.
 */
const HIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

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
			const reply = (await this.options.client.send("EVAL", [
				HIT_SCRIPT,
				"1",
				redisKey,
				String(Math.max(1, Math.ceil(windowMs))),
			])) as unknown;
			if (
				!Array.isArray(reply) ||
				typeof reply[0] !== "number" ||
				typeof reply[1] !== "number"
			) {
				throw RateLimitError.invalidResponse();
			}
			const [count, ttl] = reply as [number, number];
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
