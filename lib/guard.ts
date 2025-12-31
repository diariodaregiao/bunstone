import type { RouteSchema, HTTPHeaders, Elysia } from "elysia";
import { isClass } from "./utils/is-class";

export type HttpRequest = RouteSchema & {
  headers: HTTPHeaders;
  jwt?: {
    sign(payload: Record<string, any>): Promise<string>;
    verify(token?: string): Promise<false | Record<string, any>>;
  };
};

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
