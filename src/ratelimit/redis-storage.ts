import { RedisClient } from "bun";
import type { RateLimitResult, RateLimitStorage } from "./storage";

export interface RedisStorageOptions {
	/**
	 * An existing client, e.g. one shared with `CacheModule`. It is left open on
	 * shutdown, since its owner closes it.
	 */
	client?: RedisClient;
	/**
	 * Connection URL for a client this storage creates and closes itself.
	 * Falls back to `REDIS_URL` / `VALKEY_URL`, then `redis://localhost:6379`.
	 */
	url?: string;
	/** Prepended to every bucket key. Default `"bunstone:rl:"`. */
	prefix?: string;
}

/**
 * Counts and arms the expiry in one round trip, atomically: a separate INCR
 * and PEXPIRE could leave a key without a TTL if the process died between
 * them, locking that client out for good. A key that somehow lost its TTL is
 * repaired here too.
 */
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

/**
 * Fixed-window rate-limit storage on Redis or Valkey, through Bun's native
 * client. Unlike `MemoryStorage`, every replica shares the same counters, so a
 * limit holds across a horizontally scaled deployment.
 */
export class RedisStorage implements RateLimitStorage {
	private readonly redis: RedisClient;
	private readonly owned: boolean;
	private readonly prefix: string;

	constructor(options: RedisStorageOptions = {}) {
		this.owned = !options.client;
		this.redis =
			options.client ??
			(options.url ? new RedisClient(options.url) : new RedisClient());
		this.prefix = options.prefix ?? "bunstone:rl:";
	}

	async hit(
		key: string,
		max: number,
		windowMs: number,
	): Promise<RateLimitResult> {
		const [count, ttl] = (await this.redis.send("EVAL", [
			HIT_SCRIPT,
			"1",
			this.prefix + key,
			String(Math.max(1, Math.ceil(windowMs))),
		])) as [number, number];
		return {
			allowed: count <= max,
			limit: max,
			remaining: Math.max(0, max - count),
			resetAt: Date.now() + Math.max(0, ttl),
		};
	}

	close(): void {
		if (this.owned) this.redis.close();
	}
}
