import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthInfo, McpHttpHandler } from "@modelcontextprotocol/server";
import { Inject } from "@/core/injectable";
import { McpError } from "@/errors";
import { MAX_IDLE_TIMEOUT_MS } from "@/http/idle-timeout";
import { Ctx } from "@/http/params";
import { Controller, Delete, Get, Post } from "@/http/routing";
import type { RequestContext } from "@/http/types";
import { ApiExclude } from "@/openapi/decorators";
import { Logger } from "@/utils/logger";
import type { McpAuthGate } from "./auth";
import type { McpServerFactory } from "./server-factory";
import { serverSdk } from "./sdk";
import type { McpModuleOptions } from "./types";

const logger = new Logger("MCP");

export const DEFAULT_MCP_IDLE_TIMEOUT_MS = 120_000;

export interface McpFetchOptions {
	/** Bunstone's context of the HTTP request, passed on to `McpContext.http`. */
	http?: RequestContext;
}

/**
 * The Streamable HTTP endpoint: one SDK handler serving every request
 * statelessly, from a server instance built per request, behind the Host and
 * Origin checks and the OAuth gate. Requests arrive as the web-standard
 * `Request` Bun.serve already hands out, so nothing is converted.
 */
export class McpHttpService {
	private readonly requests = new AsyncLocalStorage<McpFetchOptions>();
	private handler?: McpHttpHandler;
	private auth?: McpAuthGate;
	private allowedHosts?: string[];
	private allowedOrigins?: string[];
	private readonly idleTimeoutSeconds: number;

	constructor(private readonly options: McpModuleOptions) {
		this.idleTimeoutSeconds = idleSeconds(options.http?.idleTimeout);
	}

	/** Called once the SDK is loaded and the primitives are known. */
	start(factory: McpServerFactory, auth: McpAuthGate | undefined): void {
		const sdk = serverSdk();
		const http = this.options.http ?? {};
		this.auth = auth;
		this.allowedHosts = hostnames(http.allowedHosts, "allowedHosts");
		// on by default: a page on another site, in a user's browser, must not
		// reach the server; clients outside a browser send no Origin and pass
		this.allowedOrigins =
			http.allowedOrigins === false
				? undefined
				: (hostnames(http.allowedOrigins, "allowedOrigins") ??
					sdk.localhostAllowedOrigins());

		this.handler = sdk.createMcpHandler(
			async ({ era, authInfo, requestInfo }) => {
				try {
					return await factory.create({
						era,
						transport: "http",
						authInfo,
						request: requestInfo,
						http: this.requests.getStore()?.http,
					});
				} catch (error) {
					logger.error("Could not build the MCP server:", error);
					throw error;
				}
			},
			{
				...(http.legacy && { legacy: http.legacy }),
				...(http.responseMode && { responseMode: http.responseMode }),
				maxRequestBodySize:
					http.maxRequestBodySize ?? sdk.DEFAULT_MAX_REQUEST_BODY_SIZE,
				// rejected requests (a wrong protocol version, missing headers)
				// already have their answer, so they are debug output
				onerror: (error) =>
					logger.debug(`MCP request rejected: ${error.message}`),
			},
		);
	}

	/**
	 * Serves one web-standard request: Host and Origin checks, the bearer token
	 * (with `auth`), then the SDK. The in-memory test client calls this.
	 */
	async fetch(
		request: Request,
		options: McpFetchOptions = {},
	): Promise<Response> {
		const handler = this.handler;
		if (!handler) throw McpError.notStarted("McpHttpService");
		const sdk = serverSdk();

		const rejected =
			(this.allowedHosts &&
				sdk.hostHeaderValidationResponse(request, this.allowedHosts)) ||
			(this.allowedOrigins &&
				sdk.originValidationResponse(request, this.allowedOrigins));
		if (rejected) return rejected;

		let authInfo: AuthInfo | undefined;
		if (this.auth) {
			const result = await this.auth.authenticate(request);
			if (result instanceof Response) return result;
			authInfo = result;
		}

		return this.requests.run(options, () =>
			handler.fetch(request, authInfo ? { authInfo } : {}),
		);
	}

	/** Serves the endpoint's route. */
	serve(ctx: RequestContext): Promise<Response> {
		// a tool calling a slow service or model outlasts the app-wide idle
		// timeout, which would cut the connection with no answer
		ctx.server.timeout?.(ctx.req, this.idleTimeoutSeconds);
		return this.fetch(ctx.req, { http: ctx }).catch((error) => {
			logger.error("MCP request failed:", error);
			return Response.json(
				{
					jsonrpc: "2.0",
					error: { code: -32603, message: "Internal server error" },
					id: null,
				},
				{ status: 500 },
			);
		});
	}

	async close(): Promise<void> {
		await this.handler?.close();
	}

	onModuleDestroy(): Promise<void> {
		return this.close();
	}
}

function idleSeconds(idleTimeout: number | undefined): number {
	const ms = idleTimeout ?? DEFAULT_MCP_IDLE_TIMEOUT_MS;
	if (!Number.isInteger(ms) || ms < 0 || ms > MAX_IDLE_TIMEOUT_MS) {
		throw McpError.invalidDefinition(
			`McpModule: \`http.idleTimeout\` must be a whole number of milliseconds from 0 to ${MAX_IDLE_TIMEOUT_MS}. Got ${String(idleTimeout)}.`,
		);
	}
	return ms === 0 ? 0 : Math.max(1, Math.ceil(ms / 1000));
}

function hostnames(value: unknown, option: string): string[] | undefined {
	if (value === undefined) return undefined;
	if (
		!Array.isArray(value) ||
		!value.every((item) => typeof item === "string" && item.length > 0)
	) {
		throw McpError.invalidDefinition(
			`McpModule: \`http.${option}\` must be a list of hostnames, such as ["localhost", "app.example.com"]${option === "allowedOrigins" ? ", or false to turn the Origin check off" : ""}.`,
		);
	}
	return [...value];
}

/**
 * The endpoint as an ordinary controller, so CORS, rate limiting and the
 * guards passed in `decorators` apply to it like to any other route.
 */
export function createMcpEndpoint(
	path: string,
	decorators: ClassDecorator[] = [],
): new (...args: never[]) => unknown {
	@ApiExclude()
	@Controller(path)
	class McpEndpointController {
		constructor(@Inject(McpHttpService) private readonly mcp: McpHttpService) {}

		@Post()
		post(@Ctx() ctx: RequestContext) {
			return this.mcp.serve(ctx);
		}

		@Get()
		get(@Ctx() ctx: RequestContext) {
			return this.mcp.serve(ctx);
		}

		@Delete()
		delete(@Ctx() ctx: RequestContext) {
			return this.mcp.serve(ctx);
		}
	}
	for (const decorator of decorators) decorator(McpEndpointController);
	return McpEndpointController;
}

/** Serves the RFC 9728 protected resource metadata the 401 challenge points at. */
export function createMetadataEndpoint(
	paths: string[],
	metadata: object,
): new (...args: never[]) => unknown {
	const body = JSON.stringify(metadata);
	const respond = () =>
		new Response(body, {
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
				"cache-control": "public, max-age=3600",
			},
		});

	@ApiExclude()
	@Controller()
	class McpMetadataController {}
	const prototype = McpMetadataController.prototype as unknown as Record<
		string,
		unknown
	>;
	paths.forEach((path, index) => {
		const key = `metadata${index}`;
		prototype[key] = respond;
		Get(path)(prototype, key, {
			value: respond,
		} as TypedPropertyDescriptor<unknown>);
	});
	return McpMetadataController;
}
