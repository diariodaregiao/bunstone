import "reflect-metadata";
import { Injectable } from "./injectable";

/**
 * Decorator to mark a class as a controller and define its base path.
 * @param pathname The base path for the controller.
 * @returns A class decorator.
 */
export function Controller(pathname: string = "/"): ClassDecorator {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return function (target: any) {
    Injectable()(target);

    const controllerMethods = Object.getOwnPropertyNames(
      target.prototype
    ).filter((method) => method !== "constructor");

    const controllerHttpMethods = Symbol.for("dip:controller:http-methods");

    for (const controllerMethod of controllerMethods) {
      if (
        !target[controllerHttpMethods] ||
        target[controllerHttpMethods].length === 0
      ) {
        target[controllerHttpMethods] = [];
      }

      const [httpMethod, pathname] = Reflect.getMetadata(
        "dip:http-method",
        target.prototype[controllerMethod]
      ).split(" ");

      target[controllerHttpMethods].push({
        httpMethod,
        pathname,
        methodName: controllerMethod,
      });
    }

    Reflect.defineMetadata("dip:controller", "is_controller", target);
    Reflect.defineMetadata("dip:controller:pathname", pathname, target);
  };
}
