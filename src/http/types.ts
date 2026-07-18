import type { Server } from "bun";

export type BunServer = Server<undefined>;

export type BunRequest = Request & { params: Record<string, string> };

export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "HEAD"
	| "OPTIONS";

export interface RequestContext {
	readonly req: BunRequest;
	readonly server: BunServer;
	readonly url: URL;
	readonly params: Record<string, string>;
	readonly query: URLSearchParams;
	readonly headers: Headers;

	readonly responseHeaders: Headers;

	readonly state: Record<string, unknown>;

	statusCode?: number;

	body: unknown;
	bodyRead: boolean;
}

export function createContext(
	req: BunRequest,
	server: BunServer,
): RequestContext {
	const url = new URL(req.url);
	return {
		req,
		server,
		url,
		params: req.params ?? {},
		query: url.searchParams,
		headers: req.headers,
		responseHeaders: new Headers(),
		state: {},
		body: undefined,
		bodyRead: false,
	};
}
