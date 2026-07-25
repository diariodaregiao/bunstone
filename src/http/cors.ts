import { ConfigurationError } from "@/errors";
import type { RequestContext } from "./types";

export interface CorsOptions {
	origin?: string | string[] | boolean;

	methods?: string[];

	allowedHeaders?: string[];

	exposedHeaders?: string[];

	credentials?: boolean;

	maxAge?: number;
}

const DEFAULT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

/** `origin: true` reflects whatever the caller sent, which is also a wildcard. */
function isWildcardOrigin(origin: CorsOptions["origin"]): boolean {
	return origin === undefined || origin === "*" || origin === true;
}

export class Cors {
	constructor(private readonly options: CorsOptions = {}) {
		// Reflecting an arbitrary origin *with credentials* is strictly worse
		// than the wildcard the browser would have rejected: it would let any
		// site read authenticated responses. Refuse the combination outright.
		if (options.credentials === true && isWildcardOrigin(options.origin)) {
			throw new ConfigurationError(
				"`cors.credentials` requires an explicit `origin` allowlist.",
				"BNS-CFG-003",
				'Set `origin` to the exact origins you trust, for example `origin: ["https://app.example.com"]`. A wildcard origin cannot be combined with credentials.',
				{ origin: options.origin ?? "*" },
			);
		}
	}

	private resolveOrigin(requestOrigin: string | null): string | null {
		const { origin = "*" } = this.options;
		if (origin === true) return requestOrigin ?? "*";
		if (origin === false) return null;
		if (origin === "*") return "*";
		if (typeof origin === "string") return origin;
		if (!requestOrigin) return null;
		return origin.includes(requestOrigin) ? requestOrigin : null;
	}

	headers(ctx: RequestContext): Record<string, string> {
		const requestOrigin = ctx.headers.get("origin");
		const resolved = this.resolveOrigin(requestOrigin);
		// the answer depends on the origin, so caches must key on it either way
		if (resolved === null) return { vary: "Origin" };

		const headers: Record<string, string> = {
			"access-control-allow-origin": resolved,
		};
		if (resolved !== "*") headers.vary = "Origin";
		// the constructor guarantees credentials never pairs with a wildcard
		if (this.options.credentials === true) {
			headers["access-control-allow-credentials"] = "true";
		}
		if (this.options.exposedHeaders?.length) {
			headers["access-control-expose-headers"] =
				this.options.exposedHeaders.join(", ");
		}
		return headers;
	}

	isPreflight(ctx: RequestContext): boolean {
		return (
			ctx.req.method === "OPTIONS" &&
			ctx.headers.has("access-control-request-method")
		);
	}

	preflightResponse(ctx: RequestContext): Response {
		const headers = new Headers(this.headers(ctx));
		headers.set(
			"access-control-allow-methods",
			(this.options.methods ?? DEFAULT_METHODS).join(", "),
		);
		// `*` is not a wildcard once credentials are on: echo what was asked for
		const allowedHeaders =
			this.options.allowedHeaders?.join(", ") ??
			ctx.headers.get("access-control-request-headers") ??
			(this.options.credentials ? null : "*");
		if (allowedHeaders) {
			headers.set("access-control-allow-headers", allowedHeaders);
		}
		if (this.options.maxAge !== undefined) {
			headers.set("access-control-max-age", String(this.options.maxAge));
		}
		return new Response(null, { status: 204, headers });
	}
}
