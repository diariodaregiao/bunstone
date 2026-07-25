import "reflect-metadata";
import type { Constructor } from "@/core/injectable";
import type { RequestContext } from "./types";

export interface GuardContract {
	canActivate(ctx: RequestContext): boolean | Promise<boolean>;
}

export const GUARDS_METADATA = "bunstone:guards";

export function UseGuards(
	...guards: Constructor<GuardContract>[]
): ClassDecorator & MethodDecorator {
	return ((target: object, propertyKey?: string | symbol) => {
		if (propertyKey === undefined) {
			// merge, so stacking @Jwt() and @UseGuards() on one class keeps both
			const existing: Constructor<GuardContract>[] =
				Reflect.getOwnMetadata(GUARDS_METADATA, target) ?? [];
			Reflect.defineMetadata(GUARDS_METADATA, [...existing, ...guards], target);
		} else {
			const existing: Constructor<GuardContract>[] =
				Reflect.getOwnMetadata(GUARDS_METADATA, target, propertyKey) ?? [];
			Reflect.defineMetadata(
				GUARDS_METADATA,
				[...existing, ...guards],
				target,
				propertyKey,
			);
		}
	}) as ClassDecorator & MethodDecorator;
}

/**
 * Inherited on purpose: `@Controller` and its path are read with inherited
 * metadata, so a subclass that inherits its routes must inherit their guards
 * too — otherwise extending a guarded controller silently opens it up.
 */
export function getControllerGuards(
	controller: Constructor,
): Constructor<GuardContract>[] {
	return Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
}

export function getRouteGuards(
	controller: Constructor,
	handlerName: string,
): Constructor<GuardContract>[] {
	return (
		Reflect.getMetadata(GUARDS_METADATA, controller.prototype, handlerName) ??
		[]
	);
}
