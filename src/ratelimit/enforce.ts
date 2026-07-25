import { TooManyRequestsException } from "@/http/exceptions";
import type { RequestContext } from "@/http/types";
import type { RateLimitConfig } from "./decorator";
import type { RateLimitStorage } from "./storage";

/**
 * Keyed by the route *template* (`/users/:id`), never the concrete path —
 * otherwise varying the parameter mints a fresh bucket per request and the
 * limit never applies.
 */
function defaultKey(ctx: RequestContext, route: string): string {
	const ip = ctx.server.requestIP(ctx.req)?.address ?? "unknown";
	return `${ip}:${ctx.req.method}:${route}`;
}

export async function enforceRateLimit(
	ctx: RequestContext,
	config: RateLimitConfig,
	storage: RateLimitStorage,
	route: string,
): Promise<void> {
	const key = config.keyGenerator
		? config.keyGenerator(ctx)
		: defaultKey(ctx, route);
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
