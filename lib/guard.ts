import "reflect-metadata";
import type { ClassConstructor } from "./interfaces/class-constructor";
import { isClass } from "./utils/is-class";

/**
 * Decorator to define a guard class.
 * @param guard The guard class constructor.
 * @returns A class or method decorator.
 */
export function Guard(guard: ClassConstructor) {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (!("validate" in guard.prototype)) {
      throw new Error(`Guard class must implement 'validate' method.`);
    }

    if (isClass(target)) {
      Reflect.defineMetadata("dip:guard", guard, target);
    }

    if (propertyKey && descriptor) {
      Reflect.defineMetadata("dip:guard", guard, target, propertyKey);
    }
  };
}
