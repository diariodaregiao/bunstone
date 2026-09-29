import "reflect-metadata";
import { ZodError, type ZodType, type z } from "zod/v4";
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
	STATE = "state",
	FORM_DATA = "form-data",
}

export interface FormDataPayload<TFields = Record<string, string>> {
	/** Every non-file field, or the result of the `fields` schema when one is given. */
	fields: TFields;
	/** Every file part, in the order it was sent. */
	files: File[];
	/** The same files grouped by the form field they were sent under. */
	filesByField: Record<string, File[]>;
}

export interface FormDataFileOptions {
	/** Reject the request with 400 when no file is sent under this field. Default `false`. */
	required?: boolean;
	/** Document the field as accepting several files. Default `false`. */
	multiple?: boolean;
	/** Shown next to the field in the OpenAPI document. */
	description?: string;
	/** Accepted media types, documented as the part's `contentType`. Not enforced. */
	accept?: string | string[];
}

export interface FormDataOptions {
	/** Zod schema that validates the text fields and documents them in OpenAPI. */
	fields?: ZodType;
	/** The file fields the route accepts, keyed by form field name. */
	files?: Record<string, FormDataFileOptions>;
}

/** The payload type a `@FormData({ fields })` parameter receives. */
export type InferFormData<TSchema extends ZodType> = FormDataPayload<
	z.output<TSchema>
>;

interface ParamMetadata {
	index: number;
	source: ParamSource;
	key?: string;
	schema?: ZodType;
	formData?: FormDataOptions;
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

export function State(key?: string): ParameterDecorator {
	return (target, propertyKey, index) => {
		addParam(target, propertyKey as string, {
			index,
			source: ParamSource.STATE,
			key,
		});
	};
}

export function FormData(options?: FormDataOptions): ParameterDecorator {
	return (target, propertyKey, index) => {
		addParam(target, propertyKey as string, {
			index,
			source: ParamSource.FORM_DATA,
			formData: options,
		});
	};
}

interface FieldError {
	field: string;
	message: string;
}

/**
 * A browser submits an empty part with `filename=""` for a file input left
 * blank (Bun parses its name as `undefined`), so a part only counts as a file
 * the client actually chose when it has a name or content.
 */
function isChosenFile(file: File): boolean {
	return Boolean(file.name) || file.size > 0;
}

async function readMultipart(
	ctx: RequestContext,
	options: FormDataOptions = {},
): Promise<FormDataPayload<unknown>> {
	const fields: Record<string, string> = {};
	const files: File[] = [];
	const filesByField: Record<string, File[]> = {};
	try {
		const form = await ctx.req.formData();
		for (const [key, value] of form.entries()) {
			if (value instanceof File) {
				files.push(value);
				const group = filesByField[key] ?? [];
				group.push(value);
				filesByField[key] = group;
			} else {
				fields[key] = String(value);
			}
		}
	} catch {
		throw new BadRequestException("Expected multipart form data.");
	}

	const errors: FieldError[] = [];
	for (const [name, file] of Object.entries(options.files ?? {})) {
		if (file.required && !filesByField[name]?.some(isChosenFile)) {
			errors.push({ field: name, message: "File is required." });
		}
	}

	let parsedFields: unknown = fields;
	if (options.fields) {
		const result = options.fields.safeParse(fields);
		if (result.success) parsedFields = result.data;
		else errors.push(...fieldErrors(result.error));
	}

	if (errors.length > 0) {
		throw new BadRequestException({ statusCode: 400, errors });
	}
	return { fields: parsedFields, files, filesByField };
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

function fieldErrors(error: ZodError): FieldError[] {
	return error.issues.map((issue) => ({
		field: issue.path.join("."),
		message: issue.message,
	}));
}

function validate(value: unknown, schema: ZodType): unknown {
	try {
		return schema.parse(value);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new BadRequestException({
				statusCode: 400,
				errors: fieldErrors(error),
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
			case ParamSource.STATE:
				value = meta.key ? ctx.state[meta.key] : ctx.state;
				break;
			case ParamSource.FORM_DATA:
				value = await readMultipart(ctx, meta.formData);
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
