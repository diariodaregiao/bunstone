import { TooManyRequestsException } from "@/http/exceptions";
import type { RequestContext } from "@/http/types";
import type { RateLimitConfig } from "./decorator";
import type { RateLimitStorage } from "./storage";

function defaultKey(ctx: RequestContext): string {
	const ip = ctx.server.requestIP(ctx.req)?.address ?? "unknown";
	return `${ip}:${ctx.req.method}:${ctx.url.pathname}`;
}

export async function enforceRateLimit(
	ctx: RequestContext,
	config: RateLimitConfig,
	storage: RateLimitStorage,
): Promise<void> {
	const key = config.keyGenerator ? config.keyGenerator(ctx) : defaultKey(ctx);
	const result = await storage.hit(key, config.max, config.windowMs);

	ctx.responseHeaders.set("x-ratelimit-limit", String(result.limit));
	ctx.responseHeaders.set("x-ratelimit-remaining", String(result.remaining));
	ctx.responseHeaders.set(
		"x-ratelimit-reset",
		String(Math.ceil(result.resetAt / 1000)),
	);

	if (!result.allowed) {
		const retryAfter = Math.max(
			0,
			Math.ceil((result.resetAt - Date.now()) / 1000),
		);
		ctx.responseHeaders.set("retry-after", String(retryAfter));
		throw new TooManyRequestsException(config.message ?? "Too many requests.");
	}
}
