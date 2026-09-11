import "reflect-metadata";
import type { Constructor } from "@/core/injectable";
import type { RequestContext } from "@/http/types";

export interface RateLimitConfig {
	max: number;
	windowMs: number;
	message?: string;
	/**
	 * `clientAddress` is already resolved through `trustProxy`, so a custom key
	 * stays correct behind a reverse proxy without re-reading the headers.
	 */
	keyGenerator?: (ctx: RequestContext, clientAddress: string) => string;
}

/** Limits every route whose template starts with `path`. */
export interface RateLimitPrefixOptions extends RateLimitConfig {
	path: string;
}

/** Global default applied via `Application.create({ rateLimit })`. */
export interface GlobalRateLimitOptions extends RateLimitConfig {
	/** Route templates excluded from the global limit (in addition to health paths). */
	skip?: readonly string[];
	/** Per-prefix limits; longest matching prefix wins. */
	prefixes?: readonly RateLimitPrefixOptions[];
}

export const RATE_LIMIT_METADATA = "bunstone:rate-limit";
export const RATE_LIMIT_CONTROLLER_METADATA = "bunstone:rate-limit-controller";
export const SKIP_RATE_LIMIT_METADATA = "bunstone:skip-rate-limit";
export const SKIP_RATE_LIMIT_CONTROLLER_METADATA =
	"bunstone:skip-rate-limit-controller";

export function RateLimit(
	config: RateLimitConfig,
): ClassDecorator & MethodDecorator {
	return ((target: object, propertyKey?: string | symbol) => {
		if (propertyKey === undefined) {
			Reflect.defineMetadata(RATE_LIMIT_CONTROLLER_METADATA, config, target);
		} else {
			Reflect.defineMetadata(RATE_LIMIT_METADATA, config, target, propertyKey);
		}
	}) as ClassDecorator & MethodDecorator;
}

export function SkipRateLimit(): ClassDecorator & MethodDecorator {
	return ((target: object, propertyKey?: string | symbol) => {
		if (propertyKey === undefined) {
			Reflect.defineMetadata(SKIP_RATE_LIMIT_CONTROLLER_METADATA, true, target);
		} else {
			Reflect.defineMetadata(
				SKIP_RATE_LIMIT_METADATA,
				true,
				target,
				propertyKey as string,
			);
		}
	}) as ClassDecorator & MethodDecorator;
}

export function hasSkipRateLimit(
	controller: Constructor,
	handlerName: string,
): boolean {
	if (
		Reflect.getMetadata(
			SKIP_RATE_LIMIT_METADATA,
			controller.prototype,
			handlerName,
		) === true
	) {
		return true;
	}
	return (
		Reflect.getMetadata(SKIP_RATE_LIMIT_CONTROLLER_METADATA, controller) ===
		true
	);
}

export function getRateLimit(
	controller: Constructor,
	handlerName: string,
): RateLimitConfig | undefined {
	return (
		Reflect.getMetadata(
			RATE_LIMIT_METADATA,
			controller.prototype,
			handlerName,
		) ??
		// inherited: a subclass of a rate-limited controller stays rate limited
		Reflect.getMetadata(RATE_LIMIT_CONTROLLER_METADATA, controller)
	);
}

export interface RateLimitResolveContext {
	global?: GlobalRateLimitOptions;
	module?: RateLimitConfig;
	/** Resolved health probe paths excluded from the global limit. */
	globalSkipPaths?: readonly string[];
	route?: string;
}

function isGlobalSkipped(
	route: string | undefined,
	global: GlobalRateLimitOptions | undefined,
	globalSkipPaths: readonly string[] | undefined,
): boolean {
	if (!global || !route) return false;
	if (globalSkipPaths?.includes(route)) return true;
	return global.skip?.includes(route) ?? false;
}

function normalizePrefixPath(path: string): string {
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function prefixToConfig(prefix: RateLimitPrefixOptions): RateLimitConfig {
	const { path: _path, ...config } = prefix;
	return config;
}

function globalDefaultConfig(global: GlobalRateLimitOptions): RateLimitConfig {
	const { skip: _skip, prefixes: _prefixes, ...config } = global;
	return config;
}

/** Longest matching prefix wins. */
export function matchPrefix(
	route: string | undefined,
	prefixes: readonly RateLimitPrefixOptions[] | undefined,
): RateLimitConfig | undefined {
	if (!route || !prefixes?.length) return undefined;

	let best: RateLimitPrefixOptions | undefined;
	for (const prefix of prefixes) {
		const normalized = normalizePrefixPath(prefix.path);
		if (route === normalized || route.startsWith(`${normalized}/`)) {
			const bestPath = best ? normalizePrefixPath(best.path) : "";
			if (!best || normalized.length > bestPath.length) {
				best = prefix;
			}
		}
	}

	return best ? prefixToConfig(best) : undefined;
}

export function resolveRateLimit(
	controller: Constructor,
	handlerName: string,
	context: RateLimitResolveContext,
): RateLimitConfig | undefined {
	if (hasSkipRateLimit(controller, handlerName)) return undefined;

	const method = Reflect.getMetadata(
		RATE_LIMIT_METADATA,
		controller.prototype,
		handlerName,
	) as RateLimitConfig | undefined;
	if (method) return method;

	const classLevel = Reflect.getMetadata(
		RATE_LIMIT_CONTROLLER_METADATA,
		controller,
	) as RateLimitConfig | undefined;
	if (classLevel) return classLevel;

	if (context.module) return context.module;

	if (
		context.global &&
		!isGlobalSkipped(context.route, context.global, context.globalSkipPaths)
	) {
		const prefix = matchPrefix(context.route, context.global.prefixes);
		if (prefix) return prefix;
		return globalDefaultConfig(context.global);
	}

	return undefined;
}
