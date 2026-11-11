import type {
	AuthInfo,
	OAuthProtectedResourceMetadata,
} from "@modelcontextprotocol/server";
import { McpError } from "@/errors";
import { HttpException } from "@/http/exceptions";
import { Logger } from "@/utils/logger";
import { httpExceptionMessage } from "./results";
import { serverSdk } from "./sdk";
import type { McpAuthOptions, McpTokenVerifier } from "./types";
import { assertScopes } from "./validation";

const logger = new Logger("MCP");

/**
 * The RFC 9728 path-aware well-known path of `resource`, plus the root one.
 * Computed without the SDK, since routes are declared before it loads.
 */
export function protectedResourceMetadataPaths(resource: string): string[] {
	const path = new URL(resource).pathname;
	const trimmed =
		path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
	const root = "/.well-known/oauth-protected-resource";
	return [...new Set([trimmed === "/" ? root : `${root}${trimmed}`, root])];
}

export function assertAuthOptions(options: McpAuthOptions): void {
	if (typeof options.resource !== "string" || !URL.canParse(options.resource)) {
		throw McpError.invalidDefinition(
			`McpModule: \`auth.resource\` must be the absolute URL of this MCP server, such as "https://api.example.com/mcp". Got ${String(options.resource)}.`,
		);
	}
	if (new URL(options.resource).hash) {
		throw McpError.invalidDefinition(
			`McpModule: \`auth.resource\` must not have a fragment: ${options.resource}.`,
		);
	}
	if (
		!Array.isArray(options.authorizationServers) ||
		options.authorizationServers.length === 0 ||
		!options.authorizationServers.every(
			(issuer) => typeof issuer === "string" && URL.canParse(issuer),
		)
	) {
		throw McpError.invalidDefinition(
			"McpModule: `auth.authorizationServers` must list the issuer URL of at least one authorization server.",
		);
	}
	assertScopes(
		options.requiredScopes?.length ? options.requiredScopes : undefined,
		"McpModule `auth.requiredScopes`",
	);
	assertScopes(
		options.scopesSupported?.length ? options.scopesSupported : undefined,
		"McpModule `auth.scopesSupported`",
	);
}

export function protectedResourceMetadata(
	options: McpAuthOptions,
): OAuthProtectedResourceMetadata {
	return {
		// as configured: the spec wants no trailing slash, which URL.href adds
		resource: options.resource,
		authorization_servers: options.authorizationServers,
		bearer_methods_supported: ["header"],
		...(options.scopesSupported && {
			scopes_supported: options.scopesSupported,
		}),
		...(options.resourceName && { resource_name: options.resourceName }),
		...(options.resourceDocumentation && {
			resource_documentation: options.resourceDocumentation,
		}),
	};
}

/**
 * The OAuth resource-server half of the MCP spec: verifies each request's
 * bearer token (its audience must be `resource`) and answers refusals with the
 * spec's 401/403 and `WWW-Authenticate` challenge.
 */
export class McpAuthGate {
	private readonly resource: URL;
	private readonly requiredScopes: string[];
	private readonly metadataUrl: string;

	constructor(
		options: McpAuthOptions,
		private readonly verifier: McpTokenVerifier,
	) {
		if (!verifier || typeof verifier.verifyAccessToken !== "function") {
			throw McpError.invalidDefinition(
				"McpModule: `auth.verifier` must be a token verifier: a class with verifyAccessToken(token), or an instance of one.",
			);
		}
		this.resource = new URL(options.resource);
		this.requiredScopes = options.requiredScopes ?? [];
		this.metadataUrl = serverSdk().getOAuthProtectedResourceMetadataUrl(
			this.resource,
		);
	}

	async authenticate(request: Request): Promise<AuthInfo | Response> {
		const { verifyBearerToken, bearerAuthChallengeResponse, OAuthError } =
			serverSdk();
		try {
			return await verifyBearerToken(request.headers.get("authorization"), {
				verifier: { verifyAccessToken: (token) => this.verify(token) },
				requiredScopes: this.requiredScopes,
				resourceMetadataUrl: this.metadataUrl,
				expectedResource: this.resource,
			});
		} catch (error) {
			if (!(error instanceof OAuthError)) {
				logger.error("The MCP token verifier failed:", error);
			}
			return bearerAuthChallengeResponse(error, {
				requiredScopes: this.requiredScopes,
				resourceMetadataUrl: this.metadataUrl,
			});
		}
	}

	private async verify(token: string): Promise<AuthInfo> {
		const { OAuthError, OAuthErrorCode } = serverSdk();
		let authInfo: AuthInfo | null | undefined;
		try {
			authInfo = await this.verifier.verifyAccessToken(token);
		} catch (error) {
			// an UnauthorizedException (or any error with status 401) refuses the
			// token; anything else is an outage
			const status =
				error instanceof HttpException
					? error.getStatus()
					: (error as { status?: unknown })?.status;
			if (status === 401) {
				const message =
					error instanceof HttpException
						? httpExceptionMessage(error)
						: (error as Error).message;
				throw new OAuthError(
					OAuthErrorCode.InvalidToken,
					message || "Invalid token",
				);
			}
			throw error;
		}
		if (!authInfo) {
			throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid token");
		}
		return authInfo;
	}
}
