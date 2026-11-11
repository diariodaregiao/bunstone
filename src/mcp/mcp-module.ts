import type { Container, Provider } from "@/core/container";
import { type Constructor, InjectionToken } from "@/core/injectable";
import type { DynamicModule } from "@/core/module";
import { McpError } from "@/errors";
import {
	assertAuthOptions,
	McpAuthGate,
	protectedResourceMetadata,
	protectedResourceMetadataPaths,
} from "./auth";
import {
	createMcpEndpoint,
	createMetadataEndpoint,
	McpHttpService,
} from "./http";
import { McpRegistry } from "./registry";
import { loadServerSdk } from "./sdk";
import { McpServerFactory } from "./server-factory";
import { McpStdioServer } from "./stdio";
import type { McpModuleOptions, McpTokenVerifier } from "./types";

export const MCP_OPTIONS = new InjectionToken<McpModuleOptions>("McpOptions");
const MCP_TOKEN_VERIFIER = new InjectionToken<McpTokenVerifier>(
	"McpTokenVerifier",
);

/**
 * Turns the application into a Model Context Protocol server: methods on your
 * providers decorated with `@Tool()`, `@Resource()`, `@ResourceTemplate()` and
 * `@Prompt()` are served over Streamable HTTP at `/mcp`, and over stdio
 * through `McpStdioServer`.
 *
 * ```ts
 * @Module({
 *   imports: [McpModule.register({ name: "notes", version: "1.0.0" })],
 *   providers: [NotesTools],
 * })
 * class AppModule {}
 * ```
 */
export class McpModule {
	static register(options: McpModuleOptions): DynamicModule {
		assertOptions(options);
		const path = options.path === false ? false : (options.path ?? "/mcp");
		const verifier = options.auth?.verifier;
		const verifierIsClass = typeof verifier === "function";

		const providers: Provider[] = [
			{ provide: MCP_OPTIONS, useValue: options },
			{
				provide: McpRegistry,
				useFactory: (opts: McpModuleOptions) => new McpRegistry(opts),
				inject: [MCP_OPTIONS],
			},
			{
				provide: McpServerFactory,
				useFactory: (registry: McpRegistry, opts: McpModuleOptions) =>
					new McpServerFactory(registry, opts),
				inject: [McpRegistry, MCP_OPTIONS],
			},
			{
				provide: McpHttpService,
				useFactory: (opts: McpModuleOptions) => new McpHttpService(opts),
				inject: [MCP_OPTIONS],
			},
			{
				provide: McpStdioServer,
				useFactory: (opts: McpModuleOptions) => new McpStdioServer(opts),
				inject: [MCP_OPTIONS],
			},
		];
		if (verifier) {
			providers.push(
				verifierIsClass
					? {
							provide: MCP_TOKEN_VERIFIER,
							useClass: verifier as Constructor<McpTokenVerifier>,
						}
					: { provide: MCP_TOKEN_VERIFIER, useValue: verifier },
			);
		}

		const controllers: Constructor[] = [];
		if (path !== false) {
			controllers.push(
				createMcpEndpoint(path, options.decorators) as Constructor,
			);
			if (options.auth) {
				controllers.push(
					createMetadataEndpoint(
						protectedResourceMetadataPaths(options.auth.resource),
						protectedResourceMetadata(options.auth),
					) as Constructor,
				);
			}
		}

		return {
			module: McpModule,
			global: true,
			imports: options.imports ?? [],
			providers,
			controllers,
			exports: [
				MCP_OPTIONS,
				McpRegistry,
				McpServerFactory,
				McpHttpService,
				McpStdioServer,
			],
		};
	}
}

function assertOptions(options: McpModuleOptions): void {
	if (!options || typeof options.name !== "string" || !options.name) {
		throw McpError.invalidDefinition(
			"McpModule.register() needs a `name`: the server's name, reported to clients.",
		);
	}
	if (typeof options.version !== "string" || !options.version) {
		throw McpError.invalidDefinition(
			"McpModule.register() needs a `version`: the server's version, reported to clients.",
		);
	}
	if (options.path !== undefined && options.path !== false) {
		if (typeof options.path !== "string" || !options.path.trim()) {
			throw McpError.invalidDefinition(
				'McpModule: `path` must be a route such as "/mcp", or `false` to serve stdio only.',
			);
		}
	}
	if (options.auth) assertAuthOptions(options.auth);
}

/**
 * Loads the SDK, finds the primitives and starts the transports. Runs after
 * `onModuleInit`, so providers are ready, and does nothing in an application
 * without `McpModule`.
 */
export async function wireMcp(
	container: Container,
	instances: readonly unknown[],
): Promise<void> {
	if (!container.has(McpRegistry)) return;
	await loadServerSdk();

	const options = container.resolve(MCP_OPTIONS);
	const registry = container.resolve(McpRegistry);
	registry.scan(container, instances);

	const factory = container.resolve(McpServerFactory);
	const auth = options.auth
		? new McpAuthGate(options.auth, container.resolve(MCP_TOKEN_VERIFIER))
		: undefined;
	container.resolve(McpHttpService).start(factory, auth);
	container.resolve(McpStdioServer).start(factory);
}
