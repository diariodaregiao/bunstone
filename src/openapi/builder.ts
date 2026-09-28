import type { Constructor } from "@/core/injectable";
import { PARAMS_METADATA, ParamSource } from "@/http/params";
import { getControllerPath, getRoutes, joinPaths } from "@/http/routing";
import { isZodSchema } from "@/utils/is-zod-schema";
import { Logger } from "@/utils/logger";
import { type ZodType, z } from "zod/v4";
import {
	getApiOperation,
	getApiResponses,
	getControllerTags,
	getRouteTags,
	hasControllerBearerAuth,
	hasRouteBearerAuth,
} from "./decorators";

export interface OpenApiInfo {
	title: string;
	version: string;
	description?: string;
}

export interface OpenApiBearerAuth {
	name?: string;
	description?: string;
	bearerFormat?: string;
}

export interface BuildOpenApiOptions {
	bearer?: boolean | OpenApiBearerAuth;
}

interface ParamMeta {
	index: number;
	source: ParamSource;
	key?: string;
	schema?: ZodType;
}

type JsonObject = Record<string, unknown>;

interface ResolvedBearer {
	schemeName: string;
	scheme: JsonObject;
	global: boolean;
}

const logger = new Logger("OpenAPI");
const DEFAULT_BEARER_SCHEME = "bearerAuth";

/**
 * Document generation runs while the HTTP server is being constructed, so a
 * schema Zod cannot express (`z.date()`, `.transform()`, `z.custom()`, ...)
 * must never be allowed to take the whole application down: degrade to a
 * permissive schema and keep booting.
 */
function toJsonSchema(schema: ZodType, route: string): JsonObject {
	try {
		const converted = z.toJSONSchema(schema, {
			unrepresentable: "any",
		}) as JsonObject;
		delete converted.$schema;
		return converted;
	} catch (error) {
		logger.warn(
			`Could not convert the schema for ${route} to JSON Schema; documenting it as unconstrained.`,
			error,
		);
		return {};
	}
}

/**
 * Zod emits `{"$ref": "#"}` for a self-referencing schema. Inline in an
 * operation that `#` resolves to the root of the OpenAPI document, so the
 * schema has to be hoisted into `components.schemas` and its internal
 * references rebased onto that location.
 */
function rebaseRefs(value: unknown, componentPath: string): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => rebaseRefs(item, componentPath));
	}
	if (value === null || typeof value !== "object") return value;

	const result: JsonObject = {};
	for (const [key, entry] of Object.entries(value as JsonObject)) {
		if (key === "$ref" && typeof entry === "string") {
			result.$ref =
				entry === "#"
					? componentPath
					: entry.startsWith("#/")
						? `${componentPath}/${entry.slice(2)}`
						: entry;
			continue;
		}
		result[key] = rebaseRefs(entry, componentPath);
	}
	return result;
}

function isSelfReferencing(schema: JsonObject): boolean {
	return JSON.stringify(schema).includes('"$ref":"#');
}

function resolveBearerConfig(
	bearer?: boolean | OpenApiBearerAuth,
): ResolvedBearer | null {
	if (!bearer) return null;

	const cfg = typeof bearer === "object" ? bearer : {};
	const schemeName = cfg.name ?? DEFAULT_BEARER_SCHEME;
	const scheme: JsonObject = { type: "http", scheme: "bearer" };
	if (cfg.description) scheme.description = cfg.description;
	if (cfg.bearerFormat) scheme.bearerFormat = cfg.bearerFormat;

	return { schemeName, scheme, global: true };
}

function requiresBearerAuth(
	controller: Constructor,
	handlerName: string,
): boolean {
	return (
		hasControllerBearerAuth(controller) ||
		hasRouteBearerAuth(controller, handlerName)
	);
}

function documentNeedsBearerScheme(
	controllers: Constructor[],
	bearer: ResolvedBearer | null,
): boolean {
	if (bearer) return true;
	return controllers.some((controller) => {
		if (hasControllerBearerAuth(controller)) return true;
		return getRoutes(controller).some((route) =>
			hasRouteBearerAuth(controller, route.handlerName),
		);
	});
}

export function buildOpenApiDocument(
	controllers: Constructor[],
	info: OpenApiInfo,
	options?: BuildOpenApiOptions,
): JsonObject {
	const bearer = resolveBearerConfig(options?.bearer);
	const schemeName = bearer?.schemeName ?? DEFAULT_BEARER_SCHEME;
	const defaultScheme: JsonObject = bearer?.scheme ?? {
		type: "http",
		scheme: "bearer",
	};
	const includeBearerScheme = documentNeedsBearerScheme(controllers, bearer);

	const paths: Record<string, JsonObject> = {};
	const schemaComponents: Record<string, JsonObject> = {};

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
				schemaComponents,
				{
					schemeName,
					globalBearer: bearer !== null,
				},
			);
			const entry = paths[fullPath] ?? {};
			entry[route.method.toLowerCase()] = operation;
			paths[fullPath] = entry;
		}
	}

	const document: JsonObject = { openapi: "3.1.0", info, paths };

	const components: JsonObject = {};
	if (Object.keys(schemaComponents).length > 0) {
		components.schemas = schemaComponents;
	}
	if (includeBearerScheme) {
		components.securitySchemes = { [schemeName]: defaultScheme };
	}
	if (Object.keys(components).length > 0) {
		document.components = components;
	}
	if (bearer) {
		document.security = [{ [schemeName]: [] }];
	}

	return document;
}

/** Moves a self-referencing schema into `components.schemas` and links to it. */
function hoist(
	schema: JsonObject,
	name: string,
	components: Record<string, JsonObject>,
): JsonObject {
	const componentPath = `#/components/schemas/${name}`;
	components[name] = rebaseRefs(schema, componentPath) as JsonObject;
	return { $ref: componentPath };
}

interface OperationBearerOptions {
	schemeName: string;
	globalBearer: boolean;
}

function buildOperation(
	controller: Constructor,
	route: { method: string; path: string; handlerName: string },
	fullPath: string,
	controllerTags: string[],
	components: Record<string, JsonObject>,
	bearerOptions: OperationBearerOptions,
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

	const requestBody = buildRequestBody(
		params,
		label,
		components,
		`${controller.name}${route.handlerName.charAt(0).toUpperCase()}${route.handlerName.slice(1)}Body`,
	);
	if (requestBody) operation.requestBody = requestBody;

	operation.responses = buildResponses(controller, route.handlerName);

	if (
		!bearerOptions.globalBearer &&
		requiresBearerAuth(controller, route.handlerName)
	) {
		operation.security = [{ [bearerOptions.schemeName]: [] }];
	}

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
	components: Record<string, JsonObject>,
	name: string,
): JsonObject | undefined {
	const body = params.find((param) => param.source === ParamSource.BODY);
	if (!body || !isZodSchema(body.schema)) return undefined;

	const converted = toJsonSchema(body.schema, route);
	const schema = isSelfReferencing(converted)
		? hoist(converted, name, components)
		: converted;

	return {
		required: true,
		content: {
			"application/json": { schema },
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
