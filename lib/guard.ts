import "reflect-metadata";
import type { ClassConstructor } from "./interfaces/class-constructor";
import { isClass } from "./utils/is-class";
import { GuardError } from "./errors";

/**
 * Decorator to define a guard class.
 * @param guard The guard class constructor.
 * @returns A class or method decorator.
 */
export function Guard(guard: ClassConstructor): any {
	return (
		target: any,
		propertyKey?: string | symbol,
		descriptor?: PropertyDescriptor,
	) => {
		if (!("validate" in guard.prototype)) {
			throw new GuardError(
				`Guard class [${guard.name}] must implement 'validate' method.`,
				"Make sure your guard class implements the GuardContract interface.",
			);
		}

		// Stage 3 decorator support (minimal)
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			const context = propertyKey as any;
			if (context.kind === "class") {
				Reflect.defineMetadata("dip:guard", guard, target);
			} else if (context.kind === "method") {
				// In Stage 3, target is the method itself.
				// We need to attach metadata to the method.
				Reflect.defineMetadata("dip:guard", guard, target);
			}
			return;
		}

		if (isClass(target)) {
			Reflect.defineMetadata("dip:guard", guard, target);
		}

		if (propertyKey && descriptor) {
			Reflect.defineMetadata("dip:guard", guard, target, propertyKey);
		}
	};
}
