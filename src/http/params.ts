import "reflect-metadata";
import { ZodError, type ZodType } from "zod/v4";
import { isZodSchema } from "@/utils/is-zod-schema";
import { BadRequestException } from "./exceptions";
import type { RequestContext } from "./types";

export enum ParamSource {
	BODY = "body",
	QUERY = "query",
	PARAM = "param",
	HEADER = "header",
	REQ = "req",
	CONTEXT = "context",
}

interface ParamMetadata {
	index: number;
	source: ParamSource;
	key?: string;
	schema?: ZodType;
}

export const PARAMS_METADATA = "bunstone:http:params";

function addParam(
	target: object,
	propertyKey: string | symbol,
	meta: ParamMetadata,
): void {
	const params: ParamMetadata[] =
		Reflect.getOwnMetadata(PARAMS_METADATA, target, propertyKey) ?? [];
	params.push(meta);
	Reflect.defineMetadata(PARAMS_METADATA, params, target, propertyKey);
}

function keyedDecorator(source: ParamSource) {
	return (keyOrSchema?: string | ZodType): ParameterDecorator =>
		(target, propertyKey, index) => {
			if (isZodSchema(keyOrSchema)) {
				addParam(target, propertyKey as string, {
					index,
					source,
					schema: keyOrSchema,
				});
			} else {
				addParam(target, propertyKey as string, {
					index,
					source,
					key: keyOrSchema,
				});
			}
		};
}

export const Body = keyedDecorator(ParamSource.BODY);

export const Query = keyedDecorator(ParamSource.QUERY);

export const Param = keyedDecorator(ParamSource.PARAM);

export function Header(name: string): ParameterDecorator {
	return (target, propertyKey, index) => {
		addParam(target, propertyKey as string, {
			index,
			source: ParamSource.HEADER,
			key: name,
		});
	};
}

export function Req(): ParameterDecorator {
	return (target, propertyKey, index) => {
		addParam(target, propertyKey as string, { index, source: ParamSource.REQ });
	};
}

export function Ctx(): ParameterDecorator {
	return (target, propertyKey, index) => {
		addParam(target, propertyKey as string, {
			index,
			source: ParamSource.CONTEXT,
		});
	};
}

async function readBody(ctx: RequestContext): Promise<unknown> {
	if (ctx.bodyRead) return ctx.body;
	ctx.bodyRead = true;

	const contentType = ctx.headers.get("content-type") ?? "";
	try {
		if (contentType.includes("application/json")) {
			const text = await ctx.req.text();
			ctx.body = text ? JSON.parse(text) : undefined;
		} else if (contentType.includes("application/x-www-form-urlencoded")) {
			const text = await ctx.req.text();
			ctx.body = Object.fromEntries(new URLSearchParams(text));
		} else {
			ctx.body = (await ctx.req.text()) || undefined;
		}
	} catch {
		throw new BadRequestException("Malformed request body.");
	}
	return ctx.body;
}

function validate(value: unknown, schema: ZodType): unknown {
	try {
		return schema.parse(value);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new BadRequestException({
				statusCode: 400,
				errors: error.issues.map((issue) => ({
					field: issue.path.join("."),
					message: issue.message,
				})),
			});
		}
		throw error;
	}
}

export async function extractArgs(
	ctx: RequestContext,
	prototype: object,
	handlerName: string,
): Promise<unknown[]> {
	const params: ParamMetadata[] =
		Reflect.getOwnMetadata(PARAMS_METADATA, prototype, handlerName) ?? [];
	if (params.length === 0) return [];

	const args = new Array<unknown>(
		Math.max(...params.map((p) => p.index)) + 1,
	).fill(undefined);

	for (const meta of params) {
		let value: unknown;
		switch (meta.source) {
			case ParamSource.BODY:
				value = await readBody(ctx);
				break;
			case ParamSource.QUERY:
				value = meta.key
					? (ctx.query.get(meta.key) ?? undefined)
					: queryObject(ctx.query);
				break;
			case ParamSource.PARAM:
				value = meta.key ? ctx.params[meta.key] : ctx.params;
				break;
			case ParamSource.HEADER:
				value = meta.key ? (ctx.headers.get(meta.key) ?? undefined) : undefined;
				break;
			case ParamSource.REQ:
				value = ctx.req;
				break;
			case ParamSource.CONTEXT:
				value = ctx;
				break;
		}

		args[meta.index] = meta.schema ? validate(value, meta.schema) : value;
	}

	return args;
}

function queryObject(
	query: URLSearchParams,
): Record<string, string | string[]> {
	const result: Record<string, string | string[]> = {};
	for (const key of new Set(query.keys())) {
		const all = query.getAll(key);
		result[key] = all.length > 1 ? all : (all[0] as string);
	}
	return result;
}
