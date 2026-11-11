import type {
	Annotations,
	AuthInfo,
	CacheHint,
	Icon,
	ServerContext,
	StandardSchemaWithJSON,
	ToolAnnotations,
} from "@modelcontextprotocol/server";
import type { Constructor, Token } from "@/core/injectable";
import type { ModuleImport } from "@/core/module";
import type { RequestContext } from "@/http/types";

/**
 * Any schema the MCP SDK accepts: a Standard Schema that also produces JSON
 * Schema. Zod 4.2+ schemas are, as they are; a plain JSON Schema document goes
 * through `fromJsonSchema()` from `@modelcontextprotocol/server`.
 */
export type McpSchema<Input = any, Output = Input> = StandardSchemaWithJSON<
	Input,
	Output
>;

interface PrimitiveOptions {
	/** Display name for people; `name` is for programs. */
	title?: string;
	/** What it does. The model reads it to decide when to use it. */
	description?: string;
	icons?: Icon[];
	/** The primitive's `_meta`, advertised as given. */
	_meta?: Record<string, unknown>;
	/**
	 * OAuth scopes the caller's token must carry, all of them. A call without
	 * them gets HTTP 403 `insufficient_scope` before the method runs. Needs the
	 * module's `auth` option on HTTP; not checked over stdio.
	 */
	scopes?: string[];
}

export interface ToolOptions extends PrimitiveOptions {
	/**
	 * 1 to 128 characters out of `A-Z a-z 0-9 _ - .`, not starting or ending
	 * with `-` or `.`. Defaults to the method name.
	 */
	name?: string;
	/** The arguments, validated before the method runs. Its root is an object. */
	inputSchema?: McpSchema;
	/** The structured result, validated before it leaves the server. */
	outputSchema?: McpSchema;
	/** Hints for clients: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. */
	annotations?: ToolAnnotations;
}

export interface ResourceOptions extends PrimitiveOptions {
	/** The resource's absolute URI, e.g. `config://app`. */
	uri: string;
	/** Defaults to the method name. */
	name?: string;
	/** The MIME type of what the method returns, used for strings and bytes. */
	mimeType?: string;
	/** Size in bytes, when known. */
	size?: number;
	annotations?: Annotations;
	/** Caching hint for `resources/read` results (revision 2026-07-28). */
	cacheHint?: CacheHint;
}

export interface ResourceTemplateOptions extends PrimitiveOptions {
	/** An RFC 6570 URI template, e.g. `notes://{id}`. The method receives its variables. */
	uriTemplate: string;
	/** Defaults to the method name. */
	name?: string;
	mimeType?: string;
	annotations?: Annotations;
	cacheHint?: CacheHint;
}

export interface PromptOptions extends PrimitiveOptions {
	/** Defaults to the method name. */
	name?: string;
	/** The arguments, an object schema; each property becomes a prompt argument. */
	argsSchema?: McpSchema;
}

export type McpPrimitiveMetadata =
	| { kind: "tool"; methodName: string; options: ToolOptions }
	| { kind: "resource"; methodName: string; options: ResourceOptions }
	| {
			kind: "resource-template";
			methodName: string;
			options: ResourceTemplateOptions;
	  }
	| { kind: "prompt"; methodName: string; options: PromptOptions };

/** What a call is for. A read through a resource template is a `resource` call. */
export type McpCallKind = "tool" | "resource" | "prompt";

/**
 * `modern` for protocol revision 2026-07-28, `legacy` for the 2025 revisions
 * (an `initialize` handshake).
 */
export type McpProtocolEra = "legacy" | "modern";

/** The second argument of every MCP method, and what MCP guards receive. */
export interface McpContext {
	readonly kind: McpCallKind;
	/** The tool or prompt name, or the resource's name. */
	readonly name: string;
	/** The URI being read, for resources. */
	readonly uri?: URL;
	/** `http` for Streamable HTTP (and the in-memory test client), `stdio` for stdio. */
	readonly transport: "http" | "stdio";
	readonly era: McpProtocolEra;
	/** The verified access token, with the module's `auth` option (HTTP only). */
	readonly authInfo?: AuthInfo;
	/** The web-standard request being served (HTTP only). */
	readonly request?: Request;
	/**
	 * Bunstone's context of the HTTP request that reached the endpoint: headers,
	 * cookies, and the `state` that guards on the endpoint filled in (e.g.
	 * `@Jwt()` stores its payload under `state.jwt`). HTTP only.
	 */
	readonly http?: RequestContext;
	/** Aborted when the client cancels the request or goes away. */
	readonly signal: AbortSignal;
	/** The SDK's own request context, for what has no shortcut here. */
	readonly server: ServerContext;
	/**
	 * Sends a progress notification for this request, if the client asked for
	 * progress; does nothing otherwise. `progress` must grow from call to call.
	 */
	reportProgress(
		progress: number,
		total?: number,
		message?: string,
	): Promise<void>;
}

/**
 * A guard on an MCP tool, resource or prompt, attached with `@UseGuards()` on
 * the provider class or method. Returning `false` answers `Forbidden`.
 */
export interface McpGuard {
	canActivate(ctx: McpContext): boolean | Promise<boolean>;
}

/** A provider method wrapped with its guards, called as `(input, context)`. */
export type McpHandler = (input: unknown, ctx: McpContext) => Promise<unknown>;

interface Entry<TOptions> {
	name: string;
	options: TOptions;
	handler: McpHandler;
	/** `Class.method`, for messages. */
	where: string;
}

export interface McpToolEntry extends Entry<ToolOptions> {
	inputSchema?: McpSchema;
	outputSchema?: McpSchema;
}

export interface McpResourceEntry extends Entry<ResourceOptions> {
	uri: string;
}

export interface McpResourceTemplateEntry extends Entry<ResourceTemplateOptions> {
	uriTemplate: string;
}

export interface McpPromptEntry extends Entry<PromptOptions> {
	argsSchema?: McpSchema;
}

/** The primitives a server instance registers. */
export interface McpPrimitives {
	tools: readonly McpToolEntry[];
	resources: readonly McpResourceEntry[];
	resourceTemplates: readonly McpResourceTemplateEntry[];
	prompts: readonly McpPromptEntry[];
}

/** What a server instance serves: one HTTP request, or one stdio connection. */
export interface McpServing {
	era: McpProtocolEra;
	transport: "http" | "stdio";
	authInfo?: AuthInfo;
	request?: Request;
	http?: RequestContext;
}

/**
 * Verifies the bearer tokens of MCP requests. The same shape as the SDK's
 * `OAuthTokenVerifier`. Return the token's `AuthInfo` to accept it (`expiresAt`
 * is required), `null` or throw an `UnauthorizedException` to refuse it with
 * 401. Anything else thrown is answered with 500.
 */
export interface McpTokenVerifier {
	verifyAccessToken(
		token: string,
	): AuthInfo | null | undefined | Promise<AuthInfo | null | undefined>;
}

export interface McpHttpOptions {
	/**
	 * How 2025-era clients are served: `'stateless'` (default) answers each
	 * request on its own; `'reject'` serves revision 2026-07-28 only.
	 */
	legacy?: "stateless" | "reject";
	/**
	 * `'auto'` (default) answers with JSON, upgraded to SSE when the method
	 * sends progress first; `'sse'` always streams; `'json'` never does.
	 */
	responseMode?: "auto" | "json" | "sse";
	/**
	 * Hostnames the `Host` header must name, e.g. `['localhost', '127.0.0.1']`,
	 * against DNS rebinding. Not checked unless set.
	 */
	allowedHosts?: string[];
	/**
	 * Origins a browser request's `Origin` may name. Requests without one
	 * (every client outside a browser) always pass. Default: localhost,
	 * 127.0.0.1 and [::1]. `false` turns the check off.
	 */
	allowedOrigins?: string[] | false;
	/** Upper bound in bytes on a request body. Default 4 MiB. */
	maxRequestBodySize?: number;
	/**
	 * Milliseconds an MCP request may stay idle, overriding the application's
	 * `idleTimeout` for this endpoint: tools that call slow services or models
	 * routinely outlast the 10-second default. Default `120000`; at most
	 * `255000`; `0` disables it.
	 */
	idleTimeout?: number;
}

export interface McpAuthOptions {
	/**
	 * Verifies the tokens: a class (resolved through DI, so it can inject what
	 * it needs) or an instance.
	 */
	verifier: McpTokenVerifier | Constructor<McpTokenVerifier>;
	/**
	 * The canonical URL of this MCP server, e.g. `https://api.example.com/mcp`:
	 * the audience a token must have been issued for (RFC 8707).
	 */
	resource: string;
	/** Issuer URLs of the authorization servers whose tokens are accepted. */
	authorizationServers: string[];
	/** Scopes advertised to clients. */
	scopesSupported?: string[];
	/** Scopes every request's token must carry. */
	requiredScopes?: string[];
	resourceName?: string;
	resourceDocumentation?: string;
}

export interface McpStdioOptions {
	/**
	 * `'serve'` (default) serves a connection that opens with the 2025
	 * `initialize` handshake; `'reject'` waits for a 2026-07-28 opening.
	 */
	legacy?: "serve" | "reject";
}

export interface McpModuleOptions {
	/** Reported to clients as `serverInfo.name`. */
	name: string;
	/** Reported to clients as `serverInfo.version`. */
	version: string;
	title?: string;
	description?: string;
	websiteUrl?: string;
	icons?: Icon[];
	/** Instructions for the model on how to use the server. */
	instructions?: string;
	/** Modules whose providers are searched for primitives. Default: all of them. */
	include?: Constructor[];
	/**
	 * Route of the Streamable HTTP endpoint. Default `"/mcp"`; `false` serves
	 * no HTTP endpoint (a stdio-only application).
	 */
	path?: string | false;
	/**
	 * Class decorators applied to the endpoint's controller, e.g.
	 * `[UseGuards(ApiKeyGuard)]`, `[Jwt()]` or `[RateLimit({...})]`.
	 */
	decorators?: ClassDecorator[];
	/** Modules whose exports a `verifier` class injects. */
	imports?: ModuleImport[];
	/**
	 * Picks the primitives one HTTP request or stdio connection is served. A key
	 * left out keeps all of its kind; a primitive left out is neither listed nor
	 * callable.
	 */
	filter?: (
		primitives: McpPrimitives,
		serving: McpServing,
	) => Partial<McpPrimitives> | Promise<Partial<McpPrimitives>>;
	http?: McpHttpOptions;
	auth?: McpAuthOptions;
	stdio?: McpStdioOptions;
}

export type { AuthInfo, Token };
