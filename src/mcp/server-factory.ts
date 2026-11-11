import type {
	CallToolResult,
	GetPromptResult,
	InputRequiredResult,
	McpServer,
	ReadResourceResult,
	ScopeChallengeHandler,
	ServerContext,
} from "@modelcontextprotocol/server";
import { instrumentMcp } from "@/observability/instrumentation";
import { Logger } from "@/utils/logger";
import type { McpRegistry } from "./registry";
import {
	INTERNAL_ERROR_MESSAGE,
	toCallToolResult,
	toGetPromptResult,
	toolErrorResult,
	toProtocolError,
	toReadResourceResult,
} from "./results";
import { serverSdk } from "./sdk";
import type {
	McpCallKind,
	McpContext,
	McpModuleOptions,
	McpPrimitives,
	McpPromptEntry,
	McpResourceEntry,
	McpResourceTemplateEntry,
	McpServing,
	McpToolEntry,
} from "./types";

const logger = new Logger("MCP");

/**
 * Builds SDK server instances: one per HTTP request, one per stdio
 * connection, each with the primitives the `filter` option keeps. Building one
 * costs a registration per primitive; schemas were checked and converted once
 * at startup.
 */
export class McpServerFactory {
	constructor(
		private readonly registry: McpRegistry,
		private readonly options: McpModuleOptions,
	) {}

	async create(serving: McpServing): Promise<McpServer> {
		const sdk = serverSdk();
		const primitives = await this.select(serving);
		const { name, version, title, description, websiteUrl, icons } =
			this.options;
		const server = new sdk.McpServer(
			{
				name,
				version,
				...defined({ title, description, websiteUrl, icons }),
			},
			defined({ instructions: this.options.instructions }),
		);

		for (const tool of primitives.tools) {
			this.registerTool(server, tool, serving);
		}
		for (const resource of primitives.resources) {
			const { title, description, mimeType, size, annotations, icons, _meta } =
				resource.options;
			server.registerResource(
				resource.name,
				resource.uri,
				{
					...defined({
						title,
						description,
						mimeType,
						size,
						annotations,
						icons,
						_meta,
						cacheHint: resource.options.cacheHint,
					}),
					...scopeChallenge(resource.options.scopes),
				},
				(uri, ctx) => this.readResource(resource, {}, uri, ctx, serving),
			);
		}
		for (const template of primitives.resourceTemplates) {
			const { title, description, mimeType, annotations, icons, _meta } =
				template.options;
			server.registerResource(
				template.name,
				new sdk.ResourceTemplate(template.uriTemplate, { list: undefined }),
				{
					...defined({
						title,
						description,
						mimeType,
						annotations,
						icons,
						_meta,
						cacheHint: template.options.cacheHint,
					}),
					...scopeChallenge(template.options.scopes),
				},
				(uri, variables, ctx) =>
					this.readResource(template, variables, uri, ctx, serving),
			);
		}
		for (const prompt of primitives.prompts) {
			this.registerPrompt(server, prompt, serving);
		}
		return server;
	}

	private async select(serving: McpServing): Promise<McpPrimitives> {
		if (!this.options.filter) return this.registry;
		const all: McpPrimitives = {
			tools: [...this.registry.tools],
			resources: [...this.registry.resources],
			resourceTemplates: [...this.registry.resourceTemplates],
			prompts: [...this.registry.prompts],
		};
		const kept = await this.options.filter(all, serving);
		if (typeof kept !== "object" || kept === null) {
			throw new TypeError(
				"McpModule: the `filter` option returned no object. Return subsets of what it receives.",
			);
		}
		return {
			tools: subset(all.tools, kept.tools, "tools"),
			resources: subset(all.resources, kept.resources, "resources"),
			resourceTemplates: subset(
				all.resourceTemplates,
				kept.resourceTemplates,
				"resourceTemplates",
			),
			prompts: subset(all.prompts, kept.prompts, "prompts"),
		};
	}

	private registerTool(
		server: McpServer,
		tool: McpToolEntry,
		serving: McpServing,
	): void {
		const { title, description, annotations, icons, _meta } = tool.options;
		const config = {
			...defined({ title, description, annotations, icons, _meta }),
			...(tool.inputSchema && { inputSchema: tool.inputSchema }),
			...(tool.outputSchema && { outputSchema: tool.outputSchema }),
			...scopeChallenge(tool.options.scopes),
		};
		// without an input schema the SDK calls back with the context alone
		const callback = tool.inputSchema
			? (args: unknown, ctx: ServerContext) =>
					this.callTool(tool, args, ctx, serving)
			: (ctx: ServerContext) => this.callTool(tool, {}, ctx, serving);
		server.registerTool(tool.name, config as never, callback as never);
	}

	private registerPrompt(
		server: McpServer,
		prompt: McpPromptEntry,
		serving: McpServing,
	): void {
		const { title, description, icons, _meta } = prompt.options;
		const config = {
			...defined({ title, description, icons, _meta }),
			...(prompt.argsSchema && { argsSchema: prompt.argsSchema }),
			...scopeChallenge(prompt.options.scopes),
		};
		const callback = prompt.argsSchema
			? (args: unknown, ctx: ServerContext) =>
					this.getPrompt(prompt, args, ctx, serving)
			: (ctx: ServerContext) => this.getPrompt(prompt, {}, ctx, serving);
		server.registerPrompt(prompt.name, config as never, callback as never);
	}

	private async callTool(
		tool: McpToolEntry,
		input: unknown,
		ctx: ServerContext,
		serving: McpServing,
	): Promise<CallToolResult | InputRequiredResult> {
		let value: unknown;
		try {
			value = await instrumentMcp("tools/call", tool.name, () =>
				tool.handler(
					input ?? {},
					createContext("tool", tool.name, undefined, ctx, serving),
				),
			);
		} catch (error) {
			logUnexpected(error, tool.where);
			return toolErrorResult(error);
		}
		try {
			return toCallToolResult(value, tool.outputSchema !== undefined);
		} catch (error) {
			logger.error(
				`${tool.where} returned a value that is not a tool result`,
				error,
			);
			return {
				content: [{ type: "text", text: INTERNAL_ERROR_MESSAGE }],
				isError: true,
			};
		}
	}

	private async readResource(
		entry: McpResourceEntry | McpResourceTemplateEntry,
		variables: unknown,
		uri: URL,
		ctx: ServerContext,
		serving: McpServing,
	): Promise<ReadResourceResult | InputRequiredResult> {
		const label = "uriTemplate" in entry ? entry.uriTemplate : entry.uri;
		let value: unknown;
		try {
			value = await instrumentMcp("resources/read", label, () =>
				entry.handler(
					{ ...(variables as object) },
					createContext("resource", entry.name, uri, ctx, serving),
				),
			);
		} catch (error) {
			logUnexpected(error, entry.where);
			throw toProtocolError(error, uri);
		}
		try {
			return toReadResourceResult(value, uri, entry.options.mimeType);
		} catch (error) {
			logger.error(
				`${entry.where} returned a value that could not be converted to a resource result`,
				error,
			);
			const { ProtocolError, ProtocolErrorCode } = serverSdk();
			throw new ProtocolError(
				ProtocolErrorCode.InternalError,
				INTERNAL_ERROR_MESSAGE,
			);
		}
	}

	private async getPrompt(
		prompt: McpPromptEntry,
		args: unknown,
		ctx: ServerContext,
		serving: McpServing,
	): Promise<GetPromptResult | InputRequiredResult> {
		let value: unknown;
		try {
			value = await instrumentMcp("prompts/get", prompt.name, () =>
				prompt.handler(
					args ?? {},
					createContext("prompt", prompt.name, undefined, ctx, serving),
				),
			);
		} catch (error) {
			logUnexpected(error, prompt.where);
			throw toProtocolError(error);
		}
		try {
			return toGetPromptResult(value, prompt.options.description);
		} catch (error) {
			logger.error(`${prompt.where}: ${(error as Error).message}`);
			throw toProtocolError(error);
		}
	}
}

function createContext(
	kind: McpCallKind,
	name: string,
	uri: URL | undefined,
	server: ServerContext,
	serving: McpServing,
): McpContext {
	return {
		kind,
		name,
		...(uri && { uri }),
		transport: serving.transport,
		era: serving.era,
		authInfo: server.http?.authInfo ?? serving.authInfo,
		request: server.http?.req ?? serving.request,
		http: serving.http,
		signal: server.mcpReq.signal,
		server,
		reportProgress: async (progress, total, message) => {
			const progressToken = server.mcpReq._meta?.progressToken;
			if (progressToken === undefined) return;
			await server.mcpReq.notify({
				method: "notifications/progress",
				params: {
					progressToken,
					progress,
					...(total !== undefined && { total }),
					...(message !== undefined && { message }),
				},
			});
		},
	};
}

/**
 * An `HttpException` or a protocol error is an answer the method chose; any
 * other error is a bug the client is not told about, so it is logged here.
 */
function logUnexpected(error: unknown, where: string): void {
	const { ProtocolError } = serverSdk();
	const status = (error as { status?: unknown })?.status;
	if (error instanceof ProtocolError || typeof status === "number") return;
	logger.error(`${where} failed:`, error);
}

/**
 * The entries of `kept`, which must come from `all`: a made-up entry would
 * carry a handler that never went through the guards.
 */
function subset<T>(
	all: readonly T[],
	kept: readonly T[] | undefined,
	key: keyof McpPrimitives,
): readonly T[] {
	if (kept === undefined) return all;
	if (!Array.isArray(kept)) {
		throw new TypeError(
			`McpModule: the \`filter\` option returned \`${key}\` that is not an array.`,
		);
	}
	const known = new Set(all);
	if (kept.some((entry) => !known.has(entry))) {
		throw new TypeError(
			`McpModule: the \`filter\` option returned an entry in \`${key}\` it was not given. Return a subset of what it receives.`,
		);
	}
	return kept;
}

function scopeChallenge(scopes: string[] | undefined): {
	scopeChallenge?: ScopeChallengeHandler;
} {
	return scopes?.length
		? {
				scopeChallenge: serverSdk().requireScopes(
					...(scopes as [string, ...string[]]),
				),
			}
		: {};
}

/** `values` without `undefined` entries: the SDK copies config fields as they are. */
function defined<T extends Record<string, unknown>>(values: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(values).filter(([, value]) => value !== undefined),
	) as Partial<T>;
}
