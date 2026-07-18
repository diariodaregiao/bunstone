import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { buildOpenApiDocument, type OpenApiInfo } from "@/openapi/builder";
import { swaggerUiHtml } from "@/openapi/ui";
import { getRateLimit } from "@/ratelimit/decorator";
import { MemoryStorage, type RateLimitStorage } from "@/ratelimit/storage";
import { Cors, type CorsOptions } from "./cors";
import { getControllerGuards, getRouteGuards } from "./guard";
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
}

export interface OpenApiServeOptions {
	info: OpenApiInfo;
	path?: string;
	uiPath?: string;
	ui?: boolean;
}

export type RouteHandler = (
	req: BunRequest,
	server: BunServer,
) => Response | Promise<Response>;
export type RoutesMap = Record<string, Record<string, RouteHandler>>;

export class HttpServer {
	private server?: BunServer;
	private readonly routes: RoutesMap;
	private readonly cors?: Cors;
	private readonly staticFiles?: StaticFiles;
	private readonly rateLimitStorage: RateLimitStorage;

	constructor(
		container: Container,
		controllers: Constructor[],
		private readonly options: HttpServerOptions = {},
		private readonly gateways: Map<string, WebSocketHandler> = new Map(),
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
	}

	private addOpenApiRoutes(
		controllers: Constructor[],
		options: OpenApiServeOptions,
	): void {
		const document = buildOpenApiDocument(controllers, options.info);
		const specPath = options.path ?? "/openapi.json";
		this.routes[specPath] = { GET: () => Response.json(document) };

		if (options.ui) {
			const uiPath = options.uiPath ?? "/docs";
			const html = swaggerUiHtml(specPath);
			this.routes[uiPath] = {
				GET: () =>
					new Response(html, {
						headers: { "content-type": "text/html; charset=utf-8" },
					}),
			};
		}
	}

	private buildRoutes(
		container: Container,
		controllers: Constructor[],
	): RoutesMap {
		const map: RoutesMap = {};
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
				const methods = map[path] ?? {};
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
		this.server = Bun.serve({
			port: port ?? this.options.port ?? 3000,
			hostname: this.options.hostname,
			routes: this.routes,
			websocket: buildWebSocketHandler(this.gateways),
			fetch: (req, server) => this.fallback(req as BunRequest, server),
		});
		return this.server;
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
		return Response.json(
			{ statusCode: 404, message: "Not Found" },
			{ status: 404, headers },
		);
	}

	async stop(): Promise<void> {
		await this.server?.stop(true);
		this.server = undefined;
		this.rateLimitStorage.close();
	}

	get raw(): BunServer | undefined {
		return this.server;
	}
}
