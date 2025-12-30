import type { RouteSchema } from "elysia";
import { isClass } from "./utils/is-class";

export type HttpRequest = RouteSchema;

export interface GuardContract {
  validate(req: HttpRequest): boolean | Promise<boolean>;
}

export interface ClassConstructor {
  new (...args: any[]): any;
}

export function Guard(guard: ClassConstructor) {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) {
    if (isClass(target)) {
      Reflect.defineMetadata("dip:guard", guard, target);
    } else {
    }
  };
}
