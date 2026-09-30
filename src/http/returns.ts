import "reflect-metadata";
import type { ZodType, z } from "zod/v4";
import type { Constructor } from "@/core/injectable";
import { ResponseValidationError } from "@/errors";
import { ApiResponse, type ApiResponseExample } from "@/openapi/decorators";
import type { RequestContext } from "./types";

export const RETURNS_METADATA = "bunstone:returns";

export interface ReturnsOptions<T> {
	/**
	 * Status the route responds with, and documents the payload under.
	 * Default: the route's usual status (`200`, or `204` for an empty body).
	 */
	status?: number;
	/** Default `"Successful response"`. */
	description?: string;
	/** An example payload, type-checked against the schema's output. */
	example?: T;
	/** Named example payloads, each type-checked against the schema's output. */
	examples?: Record<string, ApiResponseExample & { value: T }>;
	/** Media type of the body in the OpenAPI document. Default `application/json`. */
	contentType?: string;
	/**
	 * Run the returned value through the schema before sending it: unknown keys
	 * are stripped, defaults and transforms applied, and a value the schema
	 * rejects becomes a `500`. Default `true`.
	 */
	parse?: boolean;
}

export interface ReturnsMetadata {
	schema: ZodType;
	parse: boolean;
	status?: number;
}

type HandlerReturning<T> = (...args: any[]) => T | Promise<T>;

/**
 * Applicable only to a method whose return type matches `T`: with
 * `experimentalDecorators`, TypeScript rejects the decorator otherwise.
 */
export type ReturnsDecorator<T> = <M extends HandlerReturning<T>>(
	target: object,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<M>,
) => void;

/**
 * Declares the handler's response body with a Zod schema. The schema types
 * the handler's return value, is documented as the response payload in
 * OpenAPI, and (unless `parse: false`) shapes the value before it is sent.
 */
export function Returns<S extends ZodType>(
	schema: S,
	options: ReturnsOptions<z.output<S>> & { parse: false },
): ReturnsDecorator<z.output<S>>;
export function Returns<S extends ZodType>(
	schema: S,
	options?: ReturnsOptions<z.output<S>> & { parse?: true },
): ReturnsDecorator<z.input<S>>;
export function Returns(
	schema: ZodType,
	options: ReturnsOptions<unknown> = {},
): ReturnsDecorator<unknown> {
	const metadata: ReturnsMetadata = {
		schema,
		parse: options.parse ?? true,
		status: options.status,
	};
	return (target, propertyKey, descriptor) => {
		Reflect.defineMetadata(RETURNS_METADATA, metadata, target, propertyKey);
		ApiResponse({
			status: options.status ?? 200,
			description: options.description ?? "Successful response",
			schema,
			example: options.example,
			examples: options.examples,
			contentType: options.contentType,
		})(target, propertyKey, descriptor);
	};
}

export function getReturns(
	controller: Constructor,
	handlerName: string,
): ReturnsMetadata | undefined {
	return Reflect.getMetadata(
		RETURNS_METADATA,
		controller.prototype,
		handlerName,
	);
}

/**
 * Applies a route's `@Returns` contract to the handler's result. A `Response`,
 * stream or `Blob` is the handler taking over the body, so it passes through.
 */
export async function applyReturns(
	result: unknown,
	returns: ReturnsMetadata,
	ctx: RequestContext,
	route: string,
): Promise<unknown> {
	if (returns.status !== undefined) ctx.statusCode ??= returns.status;
	if (
		!returns.parse ||
		result instanceof Response ||
		result instanceof ReadableStream ||
		result instanceof Blob
	) {
		return result;
	}

	const parsed = await returns.schema.safeParseAsync(result);
	if (!parsed.success) {
		// never rethrow the ZodError itself: the error mapper turns that into a
		// 400, blaming the client for a value the server produced
		throw ResponseValidationError.mismatch(
			`${ctx.req.method} ${route}`,
			parsed.error,
		);
	}
	return parsed.data;
}
