import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { Cors, type CorsOptions } from "./cors";
import { getControllerGuards, getRouteGuards } from "./guard";
import { createRouteHandler } from "./pipeline";
import {
	getControllerPath,
	getRoutes,
	getSetHeaders,
	joinPaths,
} from "./routing";
import { StaticFiles, type StaticOptions } from "./static";
import { type BunRequest, type BunServer, createContext } from "./types";

export interface HttpServerOptions {
	port?: number;
	hostname?: string;

	cors?: CorsOptions | boolean;

	static?: StaticOptions;
}

type RouteHandler = (
	req: BunRequest,
	server: BunServer,
) => Response | Promise<Response>;
type RoutesMap = Record<string, Record<string, RouteHandler>>;

export class HttpServer {
	private server?: BunServer;
	private readonly routes: RoutesMap;
	private readonly cors?: Cors;
	private readonly staticFiles?: StaticFiles;

	constructor(
		container: Container,
		controllers: Constructor[],
		private readonly options: HttpServerOptions = {},
	) {
		this.cors = options.cors
			? new Cors(options.cors === true ? {} : options.cors)
			: undefined;
		this.staticFiles = options.static
			? new StaticFiles(options.static)
			: undefined;
		this.routes = this.buildRoutes(container, controllers);
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
					guards: [
						...getControllerGuards(controller),
						...getRouteGuards(controller, route.handlerName),
					],
					setHeaders: getSetHeaders(controller, route.handlerName),
					cors: this.cors,
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

	listen(port?: number): BunServer {
		this.server = Bun.serve({
			port: port ?? this.options.port ?? 3000,
			hostname: this.options.hostname,
			routes: this.routes,
			fetch: (req, server) => this.fallback(req as BunRequest, server),
		});
		return this.server;
	}

	private async fallback(
		req: BunRequest,
		server: BunServer,
	): Promise<Response> {
		const ctx = createContext(req, server);

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
	}

	get raw(): BunServer | undefined {
		return this.server;
	}
}
