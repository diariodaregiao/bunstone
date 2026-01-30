import type { CORSConfig } from "@elysiajs/cors";
import type { RateLimitStorage } from "../ratelimit/interfaces/storage.interface";
import type { HttpRequest } from "./http-request";

/**
 * Configuration for the Email Adapter.
 */
export type EmailConfig = {
	host?: string;
	port?: number;
	secure?: boolean;
	auth?: {
		user: string;
		pass: string;
	};
	from?: string;
};

/**
 * Global rate limit configuration.
 * Applied to all endpoints unless overridden by controller or method config.
 */
export type RateLimitGlobalConfig = {
	/** Enable rate limiting globally */
	enabled?: boolean;
	/** Maximum requests per window (default: 100) */
	max?: number;
	/** Time window in milliseconds (default: 60000 = 1 minute) */
	windowMs?: number;
	/** Custom storage implementation (default: MemoryStorage) */
	storage?: RateLimitStorage;
	/** Custom key generator function */
	keyGenerator?: (req: HttpRequest) => string;
	/** Header that allows bypassing rate limit */
	skipHeader?: string;
	/** Function to determine if rate limit should be skipped */
	skip?: (req: HttpRequest) => boolean;
	/** Custom message when rate limit is exceeded */
	message?: string;
};

/**
 * Options for configuring the application.
 * @property cors - CORS configuration options.
 * @property swagger - Swagger configuration options.
 * @property rateLimit - Global rate limiting configuration.
 */
export type Options = {
	cors?: CORSConfig;
	viewsDir?: string;
	swagger?: {
		path?: string;
		documentation?: {
			info: {
				title: string;
				version: string;
				description?: string;
			};
			tags?: { name: string; description: string }[];
		};
	};
	/** Global rate limit configuration applied to all endpoints */
	rateLimit?: RateLimitGlobalConfig;
};
