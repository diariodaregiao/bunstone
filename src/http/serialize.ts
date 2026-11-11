import type { RequestContext } from "./types";

export function serialize(result: unknown, ctx: RequestContext): Response {
	if (result instanceof Response) {
		return applyHeaders(result, ctx);
	}

	const status = ctx.statusCode;

	if (result === null || result === undefined) {
		return applyHeaders(new Response(null, { status: status ?? 204 }), ctx);
	}

	if (result instanceof ReadableStream || result instanceof Blob) {
		// Bun answers `new Response(s3File)` with a redirect to a presigned URL
		// and rejects any init for it, so none is passed unless a status is set
		const response =
			status === undefined
				? new Response(result)
				: new Response(result, { status });
		return applyHeaders(response, ctx);
	}

	if (typeof result === "string") {
		const response = new Response(result, { status: status ?? 200 });
		response.headers.set("content-type", "text/plain; charset=utf-8");
		return applyHeaders(response, ctx);
	}

	return applyHeaders(Response.json(result, { status: status ?? 200 }), ctx);
}

function applyHeaders(response: Response, ctx: RequestContext): Response {
	for (const [name, value] of ctx.responseHeaders) {
		response.headers.set(name, value);
	}
	return response;
}
