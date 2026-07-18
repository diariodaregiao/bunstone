import { ZodError } from "zod/v4";
import { Logger } from "@/utils/logger";
import { HttpException } from "./exceptions";
import type { RequestContext } from "./types";

const logger = new Logger("Http");

export function errorToResponse(error: unknown, ctx: RequestContext): Response {
	if (error instanceof HttpException) {
		return withHeaders(
			Response.json(error.getResponse(), { status: error.getStatus() }),
			ctx,
		);
	}

	if (error instanceof ZodError) {
		return withHeaders(
			Response.json(
				{
					statusCode: 400,
					errors: error.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
					})),
				},
				{ status: 400 },
			),
			ctx,
		);
	}

	logger.error(
		`Unhandled error on ${ctx.req.method} ${ctx.url.pathname}:`,
		error,
	);
	return withHeaders(
		Response.json(
			{ statusCode: 500, message: "Internal Server Error" },
			{ status: 500 },
		),
		ctx,
	);
}

function withHeaders(response: Response, ctx: RequestContext): Response {
	for (const [name, value] of ctx.responseHeaders) {
		response.headers.set(name, value);
	}
	return response;
}
