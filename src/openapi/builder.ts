import { type ZodType, z } from "zod/v4";
import type { Constructor } from "@/core/injectable";
import { PARAMS_METADATA, ParamSource } from "@/http/params";
import { getControllerPath, getRoutes, joinPaths } from "@/http/routing";
import { isZodSchema } from "@/utils/is-zod-schema";
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

export function buildOpenApiDocument(
	controllers: Constructor[],
	info: OpenApiInfo,
): JsonObject {
	const paths: Record<string, JsonObject> = {};

	for (const controller of controllers) {
		const base = getControllerPath(controller);
		const controllerTags = getControllerTags(controller);

		for (const route of getRoutes(controller)) {
			const fullPath = toOpenApiPath(joinPaths(base, route.path));
			const operation = buildOperation(controller, route, controllerTags);
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

	const parameters = buildParameters(route.path, params);
	if (parameters.length > 0) operation.parameters = parameters;

	const requestBody = buildRequestBody(params);
	if (requestBody) operation.requestBody = requestBody;

	operation.responses = buildResponses(controller, route.handlerName);
	return operation;
}

function buildParameters(path: string, params: ParamMeta[]): JsonObject[] {
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
			const schema = z.toJSONSchema(param.schema) as JsonObject;
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

function buildRequestBody(params: ParamMeta[]): JsonObject | undefined {
	const body = params.find((param) => param.source === ParamSource.BODY);
	if (!body || !isZodSchema(body.schema)) return undefined;
	return {
		required: true,
		content: {
			"application/json": { schema: z.toJSONSchema(body.schema) },
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
