import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import { instrumentRequest } from "@/observability/instrumentation";
import type { RateLimitConfig } from "@/ratelimit/decorator";
import { enforceRateLimit } from "@/ratelimit/enforce";
import type { RateLimitStorage } from "@/ratelimit/storage";
import type { Cors } from "./cors";
import { errorToResponse } from "./errors";
import { ForbiddenException, InternalServerErrorException } from "./exceptions";
import type { GuardContract } from "./guard";
import { extractArgs } from "./params";
import { serialize } from "./serialize";
import { type SseMessage, type SseOptions, sseResponse } from "./sse";
import {
	type BunRequest,
	type BunServer,
	createContext,
	type RequestContext,
} from "./types";

export interface RouteHandlerConfig {
	container: Container;
	controller: Constructor;
	handlerName: string;
	route: string;
	guards: Constructor<GuardContract>[];
	setHeaders: Record<string, string>;
	cors?: Cors;
	rateLimit?: RateLimitConfig;
	rateLimitStorage?: RateLimitStorage;
	sse?: SseOptions;
}

type Handler = (...args: unknown[]) => unknown;

export function createRouteHandler(config: RouteHandlerConfig) {
	const {
		container,
		controller,
		handlerName,
		route,
		guards,
		setHeaders,
		cors,
		rateLimit,
		rateLimitStorage,
		sse,
	} = config;
	const prototype = controller.prototype;
	const setHeaderEntries = Object.entries(setHeaders);

	return (req: BunRequest, server: BunServer): Promise<Response> =>
		instrumentRequest(req.method, route, async () => {
			const ctx = createContext(req, server);
			applyStaticHeaders(ctx, setHeaderEntries);
			if (cors) applyCors(ctx, cors);

			try {
				if (rateLimit && rateLimitStorage) {
					await enforceRateLimit(ctx, rateLimit, rateLimitStorage);
				}

				for (const GuardClass of guards) {
					const guard = container.resolve(GuardClass);
					if (!(await guard.canActivate(ctx))) {
						throw new ForbiddenException();
					}
				}

				const instance = container.resolve(controller) as Record<
					string,
					Handler
				>;
				const handler = instance[handlerName];
				if (typeof handler !== "function") {
					throw new InternalServerErrorException(
						`Handler "${handlerName}" is not a function.`,
					);
				}
				const args = await extractArgs(ctx, prototype, handlerName);
				const result = await handler.apply(instance, args);

				if (sse) {
					return sseResponse(result as AsyncIterable<SseMessage>, {
						signal: req.signal,
						heartbeatMs: sse.heartbeatMs,
					});
				}
				return serialize(result, ctx);
			} catch (error) {
				return errorToResponse(error, ctx);
			}
		});
}

function applyStaticHeaders(
	ctx: RequestContext,
	entries: [string, string][],
): void {
	for (const [name, value] of entries) {
		ctx.responseHeaders.set(name, value);
	}
}

function applyCors(ctx: RequestContext, cors: Cors): void {
	for (const [name, value] of Object.entries(cors.headers(ctx))) {
		ctx.responseHeaders.set(name, value);
	}
}
