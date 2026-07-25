import { RouteMatcher } from "@/http/matcher";
import type { HttpServer, RoutesMap } from "@/http/server";
import type { BunRequest, BunServer } from "@/http/types";

const fakeServer = {
	requestIP: () => ({ address: "127.0.0.1", family: "IPv4", port: 0 }),
	upgrade: () => false,
} as unknown as BunServer;

export interface TestRequestOptions {
	headers?: Record<string, string>;
}

export class TestApp {
	private readonly routes: RoutesMap;
	private readonly matcher = new RouteMatcher();

	constructor(server: HttpServer) {
		this.routes = server.getRoutesMap();
		for (const path of Object.keys(this.routes)) this.matcher.add(path);
	}

	get(path: string, options?: TestRequestOptions): Promise<Response> {
		return this.dispatch("GET", path, { headers: options?.headers });
	}

	delete(path: string, options?: TestRequestOptions): Promise<Response> {
		return this.dispatch("DELETE", path, { headers: options?.headers });
	}

	post(
		path: string,
		body?: unknown,
		options?: TestRequestOptions,
	): Promise<Response> {
		return this.dispatch("POST", path, jsonInit(body, options));
	}

	put(
		path: string,
		body?: unknown,
		options?: TestRequestOptions,
	): Promise<Response> {
		return this.dispatch("PUT", path, jsonInit(body, options));
	}

	patch(
		path: string,
		body?: unknown,
		options?: TestRequestOptions,
	): Promise<Response> {
		return this.dispatch("PATCH", path, jsonInit(body, options));
	}

	private dispatch(
		method: string,
		path: string,
		init: RequestInit,
	): Promise<Response> {
		const url = `http://test.local${path.startsWith("/") ? path : `/${path}`}`;
		const req = new Request(url, { method, ...init }) as BunRequest;
		const match = this.matcher.match(new URL(url).pathname);
		const handler = match ? this.routes[match.path]?.[method] : undefined;

		// mirrors HttpServer.fallback: a known path with no handler for the method
		// is 405 with an `Allow` header, anything else is 404
		if (!handler) {
			const allowed = match ? Object.keys(this.routes[match.path] ?? {}) : [];
			if (allowed.length > 0) {
				return Promise.resolve(
					Response.json(
						{ statusCode: 405, message: "Method Not Allowed" },
						{ status: 405, headers: { allow: allowed.join(", ") } },
					),
				);
			}
			return Promise.resolve(
				Response.json(
					{ statusCode: 404, message: "Not Found" },
					{ status: 404 },
				),
			);
		}

		if (match) req.params = match.params;
		return Promise.resolve(handler(req, fakeServer));
	}
}

function jsonInit(body: unknown, options?: TestRequestOptions): RequestInit {
	if (body === undefined) return { headers: options?.headers };
	return {
		headers: { "content-type": "application/json", ...options?.headers },
		body: JSON.stringify(body),
	};
}
