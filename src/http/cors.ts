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

export class Cors {
	constructor(private readonly options: CorsOptions = {}) {}

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

		// `*` is illegal alongside credentials, so echo the caller instead
		const credentials = this.options.credentials === true;
		const allowOrigin =
			credentials && resolved === "*" ? (requestOrigin ?? "*") : resolved;

		const headers: Record<string, string> = {
			"access-control-allow-origin": allowOrigin,
		};
		if (allowOrigin !== "*") headers.vary = "Origin";
		if (credentials && allowOrigin !== "*") {
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
