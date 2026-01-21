import "reflect-metadata";
import { ZodError, type ZodType } from "zod/v4";
import { PARAM_METADATA_KEY } from "./constants";
import { BadRequestException } from "./http-exceptions";
import { isZodSchema } from "./utils/is-zod-schema";

export enum ParamType {
	BODY = "body",
	QUERY = "query",
	PARAM = "param",
	HEADER = "header",
	REQUEST = "request",
	FORM_DATA = "form-data",
}

function setParamMetadata(
	target: any,
	propertyKey: string | symbol,
	parameterIndex: number,
	type: ParamType,
	key?: string,
	options?: unknown,
) {
	const existingParams =
		Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];

	existingParams.push({ index: parameterIndex, type, key, options });

	Reflect.defineMetadata(
		PARAM_METADATA_KEY,
		existingParams,
		target,
		propertyKey,
	);
}

export function Body(schema?: ZodType): any;
export function Body(): any {
	if (arguments.length === 1) {
		const arg = arguments[0] as ZodType;
		if (isZodSchema(arg)) {
			return (target: any, propertyKey: any, parameterIndex: any) => {
				setParamMetadata(
					target,
					propertyKey as string,
					parameterIndex,
					ParamType.BODY,
					undefined,
					{ zodSchema: arg },
				);
			};
		}
	}

	return (target: any, propertyKey: any, parameterIndex: any) => {
		setParamMetadata(
			target,
			propertyKey as string,
			parameterIndex,
			ParamType.BODY,
		);
	};
}

export function Param(schema?: ZodType): any;
export function Param(key?: string): any;
export function Param(): any {
	let key: string | undefined;
	if (arguments.length === 1) {
		if (isZodSchema(arguments[0])) {
			return function (target: any, propertyKey: any, parameterIndex: any) {
				setParamMetadata(
					target,
					propertyKey as string,
					parameterIndex,
					ParamType.PARAM,
					undefined,
					{
						zodSchema: arguments[0] as ZodType,
					},
				);
			};
		}
		key = arguments[0] as string;
	}

	return (target: any, propertyKey: any, parameterIndex: any) => {
		setParamMetadata(
			target,
			propertyKey as string,
			parameterIndex,
			ParamType.PARAM,
			key,
		);
	};
}

export function Query(schema?: ZodType): any;
export function Query(key?: string): any;
export function Query(): any {
	let key: string | undefined;
	if (arguments.length === 1) {
		if (isZodSchema(arguments[0])) {
			return function (target: any, propertyKey: any, parameterIndex: any) {
				setParamMetadata(
					target,
					propertyKey as string,
					parameterIndex,
					ParamType.QUERY,
					undefined,
					{
						zodSchema: arguments[0] as ZodType,
					},
				);
			};
		}
		key = arguments[0] as string;
	}

	return (target: any, propertyKey: any, parameterIndex: any) => {
		setParamMetadata(
			target,
			propertyKey as string,
			parameterIndex,
			ParamType.QUERY,
			key,
		);
	};
}

export function Header(key: string): any {
	return (target: any, propertyKey: any, parameterIndex: any) => {
		setParamMetadata(
			target,
			propertyKey,
			parameterIndex,
			ParamType.HEADER,
			key,
		);
	};
}

export function Request(): any {
	return (target: any, propertyKey: any, parameterIndex: any) => {
		setParamMetadata(target, propertyKey, parameterIndex, ParamType.REQUEST);
	};
}

export async function processParameters(
	request: any,
	target: any,
	propertyKey: string,
): Promise<any[]> {
	const paramMetadata =
		Reflect.getOwnMetadata(
			PARAM_METADATA_KEY,
			Object.getPrototypeOf(target),
			propertyKey,
		) || [];

	const paramTypes =
		Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];

	const args: any[] = new Array(paramTypes.length);
	let cachedFormData: FormData | null = null;

	for (const metadata of paramMetadata) {
		const { index, type, key } = metadata;

		switch (type) {
			case ParamType.BODY:
				try {
					args[index] = request.body;
				} catch (_e) {
					args[index] = null;
				}
				break;

			case ParamType.QUERY:
				if (key) {
					args[index] = request.query?.[key];
				} else {
					args[index] = request.query;
				}
				break;

			case ParamType.PARAM:
				if (key === undefined) {
					args[index] = request.params;
				} else {
					args[index] = request.params?.[key];
				}
				break;

			case ParamType.HEADER:
				if (key) {
					args[index] = request.headers?.[key];
				}
				break;

			case ParamType.REQUEST:
				args[index] = request;
				break;

			case ParamType.FORM_DATA:
				cachedFormData = cachedFormData || (await readFormData(request));
				args[index] = extractFormDataPayload(
					cachedFormData,
					metadata.options as FormDataOptions | undefined,
				);
				break;
		}

		try {
			if (metadata.options?.zodSchema) {
				const zodSchema = metadata.options.zodSchema as ZodType;
				if (isZodSchema(zodSchema)) {
					args[index] = zodSchema.parse(args[index]);
				}
			}
		} catch (e) {
			if (e instanceof ZodError) {
				throw new BadRequestException({
					status: 400,
					errors: e.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
					})),
				});
			}
			throw e;
		}
	}

	return args;
}

export type FormDataOptions = {
	fileField?: string;
	allowedTypes?: string[];
	jsonField?: string;
};

export type FormDataFields = Record<string, string | string[]>;

export type FormDataPayload = {
	files: File[];
	json?: unknown;
};

const FORM_DATA_CACHE = Symbol.for("dip:form-data-cache");

async function readFormData(request: any): Promise<FormData> {
	if (request?.[FORM_DATA_CACHE]) {
		return request[FORM_DATA_CACHE];
	}

	const existingBody = request?.body;
	const bodyAsFormData = tryResolveFromBody(existingBody);
	if (bodyAsFormData) {
		request[FORM_DATA_CACHE] = bodyAsFormData;
		return bodyAsFormData;
	}

	const requestLike = request?.request || request?.raw || request;

	if (!requestLike || typeof requestLike.formData !== "function") {
		throw new Error("FormData is not available on this request.");
	}

	let formData: FormData;
	try {
		formData =
			typeof requestLike.clone === "function"
				? await requestLike.clone().formData()
				: await requestLike.formData();
	} catch (err: any) {
		const fallback = tryResolveFromBody(existingBody);
		if (fallback) {
			request[FORM_DATA_CACHE] = fallback;
			return fallback;
		}

		const reason =
			err instanceof Error
				? err.message
				: "Body already consumed or unreadable";
		throw new Error(
			`Could not read multipart form data from the request. ${reason}`,
		);
	}

	if (!(formData instanceof FormData)) {
		throw new Error("Could not read multipart form data from the request.");
	}

	request[FORM_DATA_CACHE] = formData;
	return formData;
}

function extractFormDataPayload(
	formData: FormData,
	options: FormDataOptions = {},
): FormDataPayload {
	const { fileField, allowedTypes, jsonField } = options;
	const files: File[] = [];

	const allowed = (allowedTypes || []).map((item) => item.toLowerCase());
	const getFiles = fileField
		? formData.getAll(fileField)
		: Array.from(formData.values());

	for (const value of getFiles) {
		if (value instanceof File) {
			if (allowed.length > 0 && !isAllowedFileType(value, allowed)) {
				badRequest(
					`File type for "${
						value.name
					}" is not allowed. Allowed: ${allowed.join(", ")}`,
				);
			}

			files.push(value);
		}
	}

	let parsedJson: unknown;

	if (jsonField) {
		const rawJson = formData.get(jsonField);

		if (typeof rawJson === "string") {
			try {
				parsedJson = JSON.parse(rawJson);
			} catch {
				badRequest(`Failed to parse JSON field "${jsonField}".`);
			}
		} else if (rawJson !== null) {
			badRequest(`JSON field "${jsonField}" must be a string value.`);
		}
	}

	return {
		files,
		json: parsedJson,
	};
}

function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
	const mime = file.type?.toLowerCase?.() || "";
	const extension = file.name.split(".").pop()?.toLowerCase();

	if (mime && allowedTypes.includes(mime)) return true;
	if (extension && allowedTypes.includes(extension)) return true;

	return allowedTypes.length === 0;
}

function isFormDataLike(value: unknown): value is FormData {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as FormData).get === "function" &&
		typeof (value as FormData).entries === "function"
	);
}

function tryResolveFromBody(body: unknown): FormData | null {
	if (!body) return null;
	if (isFormDataLike(body)) return body;
	if (typeof body !== "object") return null;

	const formData = new (globalThis as any).FormData();
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			value.forEach((item) => {
				appendValue(formData, key, item);
			});
			continue;
		}
		appendValue(formData, key, value);
	}

	return formData;
}

function appendValue(formData: FormData, key: string, value: unknown) {
	if (value instanceof File || value instanceof Blob) {
		formData.append(key, value);
	} else if (typeof value === "object") {
		formData.append(key, JSON.stringify(value));
	} else {
		formData.append(key, String(value));
	}
}

function badRequest(message: string): never {
	throw new BadRequestException(message);
}
