import type { CookieMap, Server } from "bun";

export interface WebSocketData {
	path: string;
}

export type BunServer = Server<WebSocketData>;

export type BunRequest = Request & {
	params: Record<string, string>;
	/** Bun's cookie jar; changes to it are sent back as `Set-Cookie`. */
	cookies: CookieMap;
};

export type HttpMethod =
	"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface RequestContext {
	readonly req: BunRequest;
	readonly server: BunServer;
	readonly url: URL;
	readonly params: Record<string, string>;
	readonly query: URLSearchParams;
	readonly headers: Headers;
	/**
	 * The request cookies. `set` and `delete` are sent back as `Set-Cookie`
	 * headers on the response.
	 */
	readonly cookies: CookieMap;

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
	// Parsing the URL costs more than most handlers do, and Bun's router has
	// already extracted the params, so it is only parsed when something reads it.
	let url: URL | undefined;
	return {
		req,
		server,
		get url() {
			url ??= new URL(req.url);
			return url;
		},
		get query() {
			return this.url.searchParams;
		},
		params: req.params ?? {},
		headers: req.headers,
		get cookies() {
			return req.cookies;
		},
		responseHeaders: new Headers(),
		state: {},
		body: undefined,
		bodyRead: false,
	};
}
