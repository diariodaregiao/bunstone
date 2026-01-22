import "reflect-metadata";

/**
 * Configuration options for request rate limiting.
 */
export interface ReqLimitOptions {
	/**
	 * Time to live in milliseconds - the time window for request counting.
	 */
	ttl: number;
	/**
	 * Maximum number of requests allowed within the TTL window.
	 */
	limit: number;
}

/**
 * In-memory storage for tracking request rates.
 * Maps identifiers to arrays of timestamps representing recent requests.
 */
class RateLimitStore {
	private store = new Map<string, number[]>();

	/**
	 * Records a new request and checks if the rate limit is exceeded.
	 * @param identifier Unique identifier for the client (e.g., IP address).
	 * @param ttl Time window in milliseconds.
	 * @param limit Maximum allowed requests in the time window.
	 * @returns True if the request is allowed, false if rate limit exceeded.
	 */
	check(identifier: string, ttl: number, limit: number): boolean {
		const now = Date.now();
		const timestamps = this.store.get(identifier) || [];

		// Remove timestamps outside the TTL window
		const validTimestamps = timestamps.filter((ts) => now - ts < ttl);

		if (validTimestamps.length >= limit) {
			return false;
		}

		// Add the current request timestamp
		validTimestamps.push(now);
		this.store.set(identifier, validTimestamps);

		return true;
	}

	/**
	 * Clears old entries from the store to prevent memory leaks.
	 * Should be called periodically.
	 */
	cleanup(ttl: number): void {
		const now = Date.now();
		for (const [key, timestamps] of this.store.entries()) {
			const validTimestamps = timestamps.filter((ts) => now - ts < ttl);
			if (validTimestamps.length === 0) {
				this.store.delete(key);
			} else {
				this.store.set(key, validTimestamps);
			}
		}
	}
}

/**
 * Global rate limit store instance.
 */
export const rateLimitStore = new RateLimitStore();

// Cleanup old entries every 60 seconds
setInterval(() => {
	rateLimitStore.cleanup(60000);
}, 60000);

/**
 * Decorator to apply rate limiting to a controller method.
 * Limits the number of requests from the same IP address within a time window.
 *
 * @param options Configuration with ttl (time to live in ms) and limit (max requests).
 *
 * @example
 * ```typescript
 * @Controller('api')
 * export class ApiController {
 *   @ReqLimit({ ttl: 60000, limit: 10 })
 *   @Post()
 *   async handle() {
 *     return { message: 'Success' };
 *   }
 * }
 * ```
 */
export function ReqLimit(options: ReqLimitOptions): any {
	return (
		target: any,
		propertyKey?: string | symbol,
		descriptor?: PropertyDescriptor,
	) => {
		if (!options.ttl || options.ttl <= 0) {
			throw new Error("ReqLimit: ttl must be a positive number.");
		}

		if (!options.limit || options.limit <= 0) {
			throw new Error("ReqLimit: limit must be a positive number.");
		}

		// Stage 3 decorator support (minimal)
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			const context = propertyKey as any;
			if (context.kind === "method") {
				Reflect.defineMetadata("dip:req-limit", options, target);
			}
			return;
		}

		if (propertyKey && descriptor) {
			Reflect.defineMetadata("dip:req-limit", options, target, propertyKey);
		}
	};
}
