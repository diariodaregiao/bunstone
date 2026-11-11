import "reflect-metadata";
import type { Constructor } from "@/core/injectable";
import { McpError } from "@/errors";
import type {
	McpPrimitiveMetadata,
	PromptOptions,
	ResourceOptions,
	ResourceTemplateOptions,
	ToolOptions,
} from "./types";

export const MCP_PRIMITIVES_METADATA = "bunstone:mcp:primitives";

const DECORATORS: Record<McpPrimitiveMetadata["kind"], string> = {
	tool: "@Tool()",
	resource: "@Resource()",
	"resource-template": "@ResourceTemplate()",
	prompt: "@Prompt()",
};

type Definition = McpPrimitiveMetadata extends infer M
	? M extends McpPrimitiveMetadata
		? Omit<M, "methodName">
		: never
	: never;

function definePrimitive(definition: Definition): MethodDecorator {
	const decorator = DECORATORS[definition.kind];
	return (target, propertyKey, descriptor) => {
		const ctor = (target as { constructor: Constructor }).constructor;
		const methodName = String(propertyKey);
		const where = `${ctor.name}.${methodName}`;
		if (typeof descriptor.value !== "function") {
			throw McpError.invalidDefinition(
				`${decorator} goes on a method, and ${where} is not one.`,
			);
		}

		// only the class's own declarations: inherited ones are merged on read,
		// so a subclass may redecorate a method it overrides
		const own: McpPrimitiveMetadata[] =
			Reflect.getOwnMetadata(MCP_PRIMITIVES_METADATA, ctor) ?? [];
		const existing = own.find((entry) => entry.methodName === methodName);
		if (existing) {
			throw McpError.invalidDefinition(
				`${where} has both ${DECORATORS[existing.kind]} and ${decorator}: a method serves one MCP primitive.`,
			);
		}
		own.push({ ...definition, methodName } as McpPrimitiveMetadata);
		Reflect.defineMetadata(MCP_PRIMITIVES_METADATA, own, ctor);
	};
}

/**
 * Exposes the method as an MCP tool, called as `(input, context)`. It may
 * return a `CallToolResult`, a string (a text result) or any other value (JSON,
 * and the `structuredContent` when there is an `outputSchema`).
 *
 * ```ts
 * @Tool({ description: "Save a note", inputSchema: z.object({ text: z.string() }) })
 * add({ text }: { text: string }, ctx: McpContext) {
 *   return this.notes.add(text);
 * }
 * ```
 */
export function Tool(options: ToolOptions = {}): MethodDecorator {
	return definePrimitive({ kind: "tool", options: { ...options } });
}

/**
 * Exposes the method as the MCP resource at a fixed `uri`, called as
 * `({}, context)`. It may return a `ReadResourceResult`, a string (text of
 * `mimeType`), bytes (a blob) or another value (JSON).
 */
export function Resource(options: ResourceOptions): MethodDecorator {
	if (typeof options?.uri !== "string" || !URL.canParse(options.uri)) {
		throw McpError.invalidDefinition(
			`@Resource() needs { uri }: an absolute URI, such as "config://app". Got ${String(options?.uri)}.`,
		);
	}
	return definePrimitive({ kind: "resource", options: { ...options } });
}

/**
 * Exposes the method as the MCP resources matching an RFC 6570 `uriTemplate`,
 * called as `(variables, context)`. Throw `NotFoundException` to answer with
 * the spec's resource-not-found error.
 */
export function ResourceTemplate(
	options: ResourceTemplateOptions,
): MethodDecorator {
	if (
		typeof options?.uriTemplate !== "string" ||
		options.uriTemplate.length === 0
	) {
		throw McpError.invalidDefinition(
			`@ResourceTemplate() needs { uriTemplate }: an RFC 6570 URI template, such as "notes://{id}". Got ${String(options?.uriTemplate)}.`,
		);
	}
	return definePrimitive({
		kind: "resource-template",
		options: { ...options },
	});
}

/**
 * Exposes the method as an MCP prompt, called as `(args, context)`. It may
 * return a `GetPromptResult`, an array of prompt messages, or a string (one
 * user message).
 */
export function Prompt(options: PromptOptions = {}): MethodDecorator {
	return definePrimitive({ kind: "prompt", options: { ...options } });
}

/**
 * The primitives declared on a class, inherited ones included; a subclass's
 * declaration replaces the base's for the same method.
 */
export function getMcpPrimitives(ctor: Constructor): McpPrimitiveMetadata[] {
	const byMethod = new Map<string, McpPrimitiveMetadata>();
	const chain: object[] = [];
	for (
		let current: object | null = ctor;
		current && current !== Function.prototype;
		current = Object.getPrototypeOf(current)
	) {
		chain.unshift(current);
	}
	for (const klass of chain) {
		const own: McpPrimitiveMetadata[] =
			Reflect.getOwnMetadata(MCP_PRIMITIVES_METADATA, klass) ?? [];
		for (const entry of own) byMethod.set(entry.methodName, entry);
	}
	return [...byMethod.values()];
}
