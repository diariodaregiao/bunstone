import "reflect-metadata";
import type { Constructor } from "@/core/injectable";
import type { RequestContext } from "@/http/types";

export interface RateLimitConfig {
	max: number;
	windowMs: number;
	message?: string;
	keyGenerator?: (ctx: RequestContext) => string;
}

export const RATE_LIMIT_METADATA = "bunstone:rate-limit";
export const RATE_LIMIT_CONTROLLER_METADATA = "bunstone:rate-limit-controller";

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

export function getRateLimit(
	controller: Constructor,
	handlerName: string,
): RateLimitConfig | undefined {
	return (
		Reflect.getOwnMetadata(
			RATE_LIMIT_METADATA,
			controller.prototype,
			handlerName,
		) ?? Reflect.getOwnMetadata(RATE_LIMIT_CONTROLLER_METADATA, controller)
	);
}
