import { type ZodType, z } from "zod/v4";
import type { Constructor } from "@/core/injectable";
import { PARAMS_METADATA, ParamSource } from "@/http/params";
import { getControllerPath, getRoutes, joinPaths } from "@/http/routing";
import { isZodSchema } from "@/utils/is-zod-schema";
import { Logger } from "@/utils/logger";
import {
	getApiOperation,
	getApiResponses,
	getControllerTags,
	getRouteTags,
} from "./decorators";

export interface OpenApiInfo {
	title: string;
	version: string;
	description?: string;
}

interface ParamMeta {
	index: number;
	source: ParamSource;
	key?: string;
	schema?: ZodType;
}

type JsonObject = Record<string, unknown>;

const logger = new Logger("OpenAPI");

/**
 * Document generation runs while the HTTP server is being constructed, so a
 * schema Zod cannot express (`z.date()`, `.transform()`, `z.custom()`, ...)
 * must never be allowed to take the whole application down: degrade to a
 * permissive schema and keep booting.
 */
function toJsonSchema(schema: ZodType, route: string): JsonObject {
	try {
		return z.toJSONSchema(schema, { unrepresentable: "any" }) as JsonObject;
	} catch (error) {
		logger.warn(
			`Could not convert the schema for ${route} to JSON Schema; documenting it as unconstrained.`,
			error,
		);
		return {};
	}
}

export function buildOpenApiDocument(
	controllers: Constructor[],
	info: OpenApiInfo,
): JsonObject {
	const paths: Record<string, JsonObject> = {};

	for (const controller of controllers) {
		const base = getControllerPath(controller);
		const controllerTags = getControllerTags(controller);

		for (const route of getRoutes(controller)) {
			const joined = joinPaths(base, route.path);
			const fullPath = toOpenApiPath(joined);
			const operation = buildOperation(
				controller,
				route,
				joined,
				controllerTags,
			);
			const entry = paths[fullPath] ?? {};
			entry[route.method.toLowerCase()] = operation;
			paths[fullPath] = entry;
		}
	}

	return { openapi: "3.1.0", info, paths };
}

function buildOperation(
	controller: Constructor,
	route: { method: string; path: string; handlerName: string },
	fullPath: string,
	controllerTags: string[],
): JsonObject {
	const params: ParamMeta[] =
		Reflect.getOwnMetadata(
			PARAMS_METADATA,
			controller.prototype,
			route.handlerName,
		) ?? [];

	const operation: JsonObject = {};
	const tags = [
		...controllerTags,
		...getRouteTags(controller, route.handlerName),
	];
	if (tags.length > 0) operation.tags = tags;

	const info = getApiOperation(controller, route.handlerName);
	if (info?.summary) operation.summary = info.summary;
	if (info?.description) operation.description = info.description;

	// Path params can be declared on the controller prefix too, and every one of
	// them is required by OpenAPI 3.1, so the joined path is what must be scanned.
	const label = `${route.method.toUpperCase()} ${fullPath}`;
	const parameters = buildParameters(fullPath, params, label);
	if (parameters.length > 0) operation.parameters = parameters;

	const requestBody = buildRequestBody(params, label);
	if (requestBody) operation.requestBody = requestBody;

	operation.responses = buildResponses(controller, route.handlerName);
	return operation;
}

function buildParameters(
	path: string,
	params: ParamMeta[],
	route: string,
): JsonObject[] {
	const parameters: JsonObject[] = [];

	for (const name of pathParamNames(path)) {
		parameters.push({
			name,
			in: "path",
			required: true,
			schema: { type: "string" },
		});
	}

	for (const param of params) {
		if (param.source === ParamSource.QUERY && param.key) {
			parameters.push({
				name: param.key,
				in: "query",
				required: false,
				schema: { type: "string" },
			});
		}
		if (param.source === ParamSource.QUERY && isZodSchema(param.schema)) {
			const schema = toJsonSchema(param.schema, route);
			const properties = (schema.properties ?? {}) as JsonObject;
			const required = (schema.required ?? []) as string[];
			for (const [name, propSchema] of Object.entries(properties)) {
				parameters.push({
					name,
					in: "query",
					required: required.includes(name),
					schema: propSchema,
				});
			}
		}
	}

	return parameters;
}

function buildRequestBody(
	params: ParamMeta[],
	route: string,
): JsonObject | undefined {
	const body = params.find((param) => param.source === ParamSource.BODY);
	if (!body || !isZodSchema(body.schema)) return undefined;
	return {
		required: true,
		content: {
			"application/json": { schema: toJsonSchema(body.schema, route) },
		},
	};
}

function buildResponses(
	controller: Constructor,
	handlerName: string,
): JsonObject {
	const responses = getApiResponses(controller, handlerName);
	if (responses.length === 0) {
		return { "200": { description: "Successful response" } };
	}
	const result: JsonObject = {};
	for (const response of responses) {
		result[String(response.status)] = {
			description: response.description ?? "",
		};
	}
	return result;
}

function pathParamNames(path: string): string[] {
	return [...path.matchAll(/:([^/]+)/g)].map((match) => match[1] as string);
}

function toOpenApiPath(path: string): string {
	return path.replace(/:([^/]+)/g, "{$1}");
}
