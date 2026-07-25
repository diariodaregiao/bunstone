import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { ConfigurationError } from "@/errors";
import {
	assertOpenApiBasicAuth,
	type OpenApiBasicAuth,
} from "@/openapi/basic-auth";
import { buildOpenApiDocument, type OpenApiInfo } from "@/openapi/builder";
import { swaggerUiHtml } from "@/openapi/ui";
import { getRateLimit } from "@/ratelimit/decorator";
import { MemoryStorage, type RateLimitStorage } from "@/ratelimit/storage";
import { Cors, type CorsOptions } from "./cors";
import { getControllerGuards, getRouteGuards } from "./guard";
import { type HealthOptions, resolveHealth } from "./health";
import { RouteMatcher } from "./matcher";
import { createRouteHandler } from "./pipeline";
import {
	getControllerPath,
	getRoutes,
	getSetHeaders,
	joinPaths,
} from "./routing";
import { getSseOptions } from "./sse";
import { StaticFiles, type StaticOptions } from "./static";
import { type BunRequest, type BunServer, createContext } from "./types";
import { buildWebSocketHandler, type WebSocketHandler } from "./websocket";

export interface HttpServerOptions {
	port?: number;
	hostname?: string;

	cors?: CorsOptions | boolean;

	static?: StaticOptions;

	rateLimitStorage?: RateLimitStorage;

	openapi?: OpenApiServeOptions;

	health?: boolean | HealthOptions;
}

export interface OpenApiServeOptions {
	info: OpenApiInfo;
	path?: string;
	uiPath?: string;
	ui?: boolean;
	auth?: OpenApiBasicAuth;
}

export type RouteHandler = (
	req: BunRequest,
	server: BunServer,
) => Response | Promise<Response>;
/** Two paths that differ only in parameter names match the same requests. */
function routeShape(path: string): string {
	return path.replace(/:[^/]+/g, ":param");
}

export type RouteMethods = Record<string, RouteHandler>;
export type RoutesMap = Record<string, RouteMethods>;

export class HttpServer {
	private server?: BunServer;
	private readonly routes: RoutesMap;
	private readonly cors?: Cors;
	private readonly staticFiles?: StaticFiles;
	private readonly rateLimitStorage: RateLimitStorage;
	private readonly matcher: RouteMatcher;

	constructor(
		container: Container,
		controllers: Constructor[],
		private readonly options: HttpServerOptions = {},
		private readonly gateways: Map<string, WebSocketHandler> = new Map(),
		private readonly isReady: () => Promise<boolean> = () =>
			Promise.resolve(true),
	) {
		this.cors = options.cors
			? new Cors(options.cors === true ? {} : options.cors)
			: undefined;
		this.staticFiles = options.static
			? new StaticFiles(options.static)
			: undefined;
		this.rateLimitStorage = options.rateLimitStorage ?? new MemoryStorage();
		this.routes = this.buildRoutes(container, controllers);
		if (options.openapi) this.addOpenApiRoutes(controllers, options.openapi);
		this.addHealthRoutes();
		this.addImplicitHeadRoutes();
		this.wrapPreflightRoutes();
		this.matcher = new RouteMatcher();
		for (const path of Object.keys(this.routes)) this.matcher.add(path);
	}

	private addHealthRoutes(): void {
		const health = resolveHealth(this.options.health);
		if (!health) return;

		this.reserve(health.path, "health", {
			GET: () => Response.json({ status: "ok" }),
		});
		this.reserve(health.readyPath, "health", {
			GET: async () =>
				(await this.isReady())
					? Response.json({ status: "ready" })
					: Response.json({ status: "not_ready" }, { status: 503 }),
		});
	}

	/**
	 * Built-in routes are registered after the controllers, so without this they
	 * would silently replace a user route mounted on the same path.
	 */
	private reserve(path: string, feature: string, methods: RouteMethods): void {
		if (this.routes[path]) {
			throw new ConfigurationError(
				`Cannot mount the built-in ${feature} route on "${path}": a controller already handles it.`,
				"BNS-HTTP-002",
				`Move the controller elsewhere or configure a different path for the ${feature} route.`,
				{ path, feature },
			);
		}
		this.routes[path] = methods;
	}

	/** HTTP requires HEAD wherever GET is served. */
	private addImplicitHeadRoutes(): void {
		for (const methods of Object.values(this.routes)) {
			const get = methods.GET;
			if (!get || methods.HEAD) continue;
			methods.HEAD = async (req, server) => {
				const response = await get(req, server);
				// the body is discarded, so it has to be cancelled: an SSE route
				// would otherwise leave its generator and heartbeat running forever
				await response.body?.cancel().catch(() => undefined);
				return new Response(null, {
					status: response.status,
					headers: response.headers,
				});
			};
		}
	}

	/**
	 * A user-defined `@Options()` route would otherwise shadow the CORS
	 * preflight, which lives in the fallback and never runs when a route matches.
	 */
	private wrapPreflightRoutes(): void {
		const cors = this.cors;
		if (!cors) return;
		for (const methods of Object.values(this.routes)) {
			const original = methods.OPTIONS;
			if (!original) continue;
			methods.OPTIONS = (req, server) => {
				const ctx = createContext(req, server);
				if (cors.isPreflight(ctx)) return cors.preflightResponse(ctx);
				return original(req, server);
			};
		}
	}

	private addOpenApiRoutes(
		controllers: Constructor[],
		options: OpenApiServeOptions,
	): void {
		const document = buildOpenApiDocument(controllers, options.info);
		const specPath = options.path ?? "/openapi.json";
		const guard = (req: BunRequest, next: () => Response): Response => {
			if (!options.auth) return next();
			return assertOpenApiBasicAuth(req, options.auth) ?? next();
		};

		this.reserve(specPath, "OpenAPI spec", {
			GET: (req) => guard(req, () => Response.json(document)),
		});

		if (options.ui) {
			const uiPath = options.uiPath ?? "/docs";
			const html = swaggerUiHtml(specPath);
			this.reserve(uiPath, "Swagger UI", {
				GET: (req) =>
					guard(
						req,
						() =>
							new Response(html, {
								headers: { "content-type": "text/html; charset=utf-8" },
							}),
					),
			});
		}
	}

	private buildRoutes(
		container: Container,
		controllers: Constructor[],
	): RoutesMap {
		const map: RoutesMap = {};
		const shapes = new Map<string, string>();
		for (const controller of controllers) {
			const base = getControllerPath(controller);
			for (const route of getRoutes(controller)) {
				const path = joinPaths(base, route.path);
				const handler = createRouteHandler({
					container,
					controller,
					handlerName: route.handlerName,
					route: path,
					guards: [
						...getControllerGuards(controller),
						...getRouteGuards(controller, route.handlerName),
					],
					setHeaders: getSetHeaders(controller, route.handlerName),
					cors: this.cors,
					rateLimit: getRateLimit(controller, route.handlerName),
					rateLimitStorage: this.rateLimitStorage,
					sse: getSseOptions(controller, route.handlerName),
				});
				const shape = routeShape(path);
				const clash = shapes.get(`${route.method} ${shape}`);
				if (clash && clash !== path) {
					throw new ConfigurationError(
						`Conflicting routes: ${route.method} ${path} and ${route.method} ${clash} match the same requests.`,
						"BNS-HTTP-001",
						"Two routes differ only in their parameter names, so one can never be reached. Give them distinct paths.",
						{ method: route.method, path, conflictsWith: clash },
					);
				}
				shapes.set(`${route.method} ${shape}`, path);

				const methods = map[path] ?? {};
				if (methods[route.method]) {
					throw new ConfigurationError(
						`Duplicate route: ${route.method} ${path} is declared more than once.`,
						"BNS-HTTP-001",
						"Two controllers or handlers map to the same method and path; give one of them a different path.",
						{ method: route.method, path, controller: controller.name },
					);
				}
				methods[route.method] = handler;
				map[path] = methods;
			}
		}
		return map;
	}

	get routeList(): string[] {
		return Object.entries(this.routes).flatMap(([path, methods]) =>
			Object.keys(methods).map((method) => `${method} ${path}`),
		);
	}

	getRoutesMap(): RoutesMap {
		return this.routes;
	}

	listen(port?: number): BunServer {
		// re-listening would otherwise leave the previous server bound and
		// unreachable by `stop()`
		this.server?.stop(true);
		this.server = Bun.serve({
			port: port ?? this.options.port ?? 3000,
			hostname: this.options.hostname,
			routes: this.routes,
			websocket: buildWebSocketHandler(this.gateways),
			fetch: (req, server) => this.fallback(req as BunRequest, server),
		});
		return this.server;
	}

	/**
	 * Routes one request exactly as the live server does, falling back to CORS
	 * preflight, static files and the 404/405 answers. `TestApp` dispatches
	 * through here so in-memory tests cannot drift from production behaviour.
	 */
	async handle(req: BunRequest, server: BunServer): Promise<Response> {
		const pathname = new URL(req.url).pathname;
		const match = this.matcher.match(pathname);
		const handler = match ? this.routes[match.path]?.[req.method] : undefined;

		if (handler && match) {
			req.params = match.params;
			return handler(req, server);
		}
		return (
			(await this.fallback(req, server)) ??
			new Response("WebSocket upgrade failed", { status: 426 })
		);
	}

	private async fallback(
		req: BunRequest,
		server: BunServer,
	): Promise<Response | undefined> {
		const ctx = createContext(req, server);

		if (this.gateways.has(ctx.url.pathname)) {
			if (server.upgrade(req, { data: { path: ctx.url.pathname } })) {
				return undefined;
			}
			return new Response("WebSocket upgrade failed", { status: 426 });
		}
		if (this.cors?.isPreflight(ctx)) {
			return this.cors.preflightResponse(ctx);
		}
		if (this.staticFiles?.matches(ctx.url.pathname)) {
			return this.staticFiles.serve(ctx.url.pathname);
		}

		const headers = this.cors ? this.cors.headers(ctx) : {};

		// the router only falls through here when no method matched, so a known
		// path means the method is unsupported rather than the route missing
		const known = this.matcher.match(ctx.url.pathname);
		const allowed = known ? Object.keys(this.routes[known.path] ?? {}) : [];
		if (allowed.length > 0) {
			return Response.json(
				{ statusCode: 405, message: "Method Not Allowed" },
				{
					status: 405,
					headers: { ...headers, allow: allowed.join(", ") },
				},
			);
		}

		return Response.json(
			{ statusCode: 404, message: "Not Found" },
			{ status: 404, headers },
		);
	}

	async stop(timeoutMs = 10_000): Promise<void> {
		const server = this.server;
		this.server = undefined;
		this.rateLimitStorage.close();
		if (!server) return;

		let timer: ReturnType<typeof setTimeout> | undefined;
		const deadline = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, timeoutMs);
			timer.unref?.();
		});
		await Promise.race([server.stop(false), deadline]);
		if (timer) clearTimeout(timer);
		// draining leaves idle keep-alive sockets open, so a client holding a
		// pooled connection could still be served after shutdown "finished"
		await server.stop(true);
	}

	get raw(): BunServer | undefined {
		return this.server;
	}
}
