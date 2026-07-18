import type { HTTPHeaders, RouteSchema } from "elysia";

/**
 * Represents an HTTP request with headers and optional JWT methods.
 * @property headers - The HTTP headers of the request.
 * @property jwt - Optional JWT methods for signing and verifying tokens.
 */

export type HttpRequest = RouteSchema & {
	headers: HTTPHeaders;
	jwt?: {
		sign(payload: Record<string, any>): Promise<string>;
		verify(token?: string): Promise<false | Record<string, any>>;
	};
};
