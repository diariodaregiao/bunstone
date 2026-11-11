import { McpError } from "@/errors";
import type { McpSchema } from "./types";

/** SEP-986 tool names; the SDK warns on each registration outside it. */
const TOOL_NAME = /^[A-Za-z0-9_](?:[A-Za-z0-9._-]{0,126}[A-Za-z0-9_])?$/;

/** RFC 6749 `scope-token`. */
const SCOPE_TOKEN = /^[\x21\x23-\x5B\x5D-\x7E]+$/;

export function assertToolName(name: unknown, where: string): string {
	if (typeof name !== "string" || !TOOL_NAME.test(name)) {
		throw McpError.invalidDefinition(
			`${where}: ${JSON.stringify(name)} is not a valid tool name.`,
			'Tool names have 1 to 128 characters out of A-Z, a-z, 0-9, "_", "-" and ".", and do not start or end with "-" or ".". Set { name } in @Tool().',
		);
	}
	return name;
}

export function assertName(name: unknown, where: string, what: string): string {
	if (typeof name !== "string" || name.trim().length === 0) {
		throw McpError.invalidDefinition(
			`${where}: the ${what} name must be a non-empty string.`,
		);
	}
	return name;
}

export function assertScopes(scopes: unknown, where: string): void {
	if (scopes === undefined) return;
	if (
		!Array.isArray(scopes) ||
		scopes.length === 0 ||
		!scopes.every(
			(scope) => typeof scope === "string" && SCOPE_TOKEN.test(scope),
		)
	) {
		throw McpError.invalidDefinition(
			`${where}: { scopes } must be a non-empty array of OAuth scope tokens (printable ASCII, no spaces, quotes or backslashes).`,
		);
	}
}

/** The JSON Schema draft the SDK converts to. */
const TARGET = "draft-2020-12";

type Converter = (options: {
	target: string;
	libraryOptions?: Record<string, unknown>;
}) => Record<string, unknown>;

/**
 * Checks that `schema` can be advertised to clients (a Standard Schema with
 * `~standard.jsonSchema`) and memoizes its JSON Schema conversions. The SDK
 * builds a server per request and would otherwise convert every schema on
 * every `tools/list`, though the result never changes.
 *
 * Input schemas (tool and prompt arguments) must describe objects.
 */
export function prepareSchema(
	schema: McpSchema,
	where: string,
	io: "input" | "output",
): McpSchema {
	const standard = (schema as Partial<McpSchema> | undefined)?.["~standard"];
	if (!standard || typeof standard.validate !== "function") {
		throw McpError.invalidSchema(where, "not a Standard Schema.");
	}
	const jsonSchema = standard.jsonSchema as
		{ input?: Converter; output?: Converter } | undefined;
	const input = jsonSchema?.input;
	const output = jsonSchema?.output;
	if (typeof input !== "function" || typeof output !== "function") {
		throw McpError.invalidSchema(
			where,
			`the "${standard.vendor}" schema cannot produce JSON Schema, which MCP clients need (Zod needs 4.2 or later).`,
		);
	}

	const converted = new Map<string, Record<string, unknown>>();
	const memoize =
		(kind: "input" | "output", convert: Converter): Converter =>
		(options) => {
			const key = `${kind}:${options?.target}`;
			let result = converted.get(key);
			if (!result) {
				result = convert(options);
				converted.set(key, result);
			}
			// a copy, so nothing the SDK does with one request's schema leaks
			return structuredClone(result);
		};

	let root: Record<string, unknown>;
	try {
		root = (io === "input" ? input : output)({ target: TARGET });
	} catch (error) {
		throw McpError.invalidSchema(
			where,
			`the schema cannot be converted to JSON Schema: ${(error as Error)?.message ?? error}`,
		);
	}
	if (io === "input" && root.type !== undefined && root.type !== "object") {
		throw McpError.invalidSchema(
			where,
			`arguments are an object, and this schema describes ${JSON.stringify(root.type)}. Wrap it in z.object({ ... }).`,
		);
	}
	converted.set(`${io}:${TARGET}`, root);

	const cached = {
		...standard,
		validate: (
			value: unknown,
			options?: Parameters<typeof standard.validate>[1],
		) => standard.validate(value, options),
		jsonSchema: {
			input: memoize("input", (options) => input(options)),
			output: memoize("output", (options) => output(options)),
		},
	};
	return new Proxy(schema, {
		get: (target, property) =>
			property === "~standard" ? cached : Reflect.get(target, property, target),
	});
}
