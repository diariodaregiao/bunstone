import { TooManyRequestsException } from "@/http/exceptions";
import type { RequestContext } from "@/http/types";
import type { RateLimitConfig } from "./decorator";
import type { RateLimitStorage } from "./storage";

/**
 * How many reverse proxies sit in front of the app. `false` (the default) reads
 * the peer address; `true` means a single hop.
 */
export type TrustProxy = boolean | number;

function trustedHops(trustProxy: TrustProxy | undefined): number {
	if (trustProxy === true) return 1;
	if (typeof trustProxy === "number" && Number.isFinite(trustProxy)) {
		return Math.max(0, Math.floor(trustProxy));
	}
	return 0;
}

/**
 * Behind a reverse proxy the peer address is the proxy's, so every client
 * collapses into one bucket and a single caller can exhaust the limit for
 * everyone else. With `trustProxy` set, the address comes from the forwarding
 * chain instead.
 *
 * Each proxy appends the peer it received from, so the chain reads
 * `client, …, nearest-proxy` and the client sits `hops` entries from the right.
 * Counting from the right is what keeps this honest: entries a client prepends
 * itself only push its real address further along, they never take the trusted
 * slot. That holds only while the app is unreachable except through those
 * proxies — a directly exposed port lets a client forge the whole chain.
 */
export function clientAddress(
	ctx: RequestContext,
	trustProxy?: TrustProxy,
): string {
	const peer = ctx.server.requestIP(ctx.req)?.address ?? "unknown";
	const hops = trustedHops(trustProxy);
	if (hops === 0) return peer;

	const chain = (ctx.headers.get("x-forwarded-for") ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
	// a chain shorter than the configured hops means the request did not travel
	// through the expected proxies, so the header is not the one we vouched for
	return chain[chain.length - hops] ?? peer;
}

/**
 * Keyed by the route *template* (`/users/:id`), never the concrete path —
 * otherwise varying the parameter mints a fresh bucket per request and the
 * limit never applies.
 */
function defaultKey(ctx: RequestContext, route: string, ip: string): string {
	// HEAD runs the GET handler, so it must not get a budget of its own
	const method = ctx.req.method === "HEAD" ? "GET" : ctx.req.method;
	return `${ip}:${method}:${route}`;
}

export async function enforceRateLimit(
	ctx: RequestContext,
	config: RateLimitConfig,
	storage: RateLimitStorage,
	route: string,
	trustProxy?: TrustProxy,
): Promise<void> {
	const ip = clientAddress(ctx, trustProxy);
	// the resolved address reaches custom generators too, so bucketing by
	// something else does not mean giving up proxy awareness
	const key = config.keyGenerator
		? config.keyGenerator(ctx, ip)
		: defaultKey(ctx, route, ip);
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
