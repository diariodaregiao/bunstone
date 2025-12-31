import "reflect-metadata";
import { Injectable } from "./injectable";

export function Controller(pathname: string = "/"): ClassDecorator {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return function (target: any) {
    Injectable()(target);

    const controllerMehods = Object.getOwnPropertyNames(
      target.prototype
    ).filter((method) => method !== "constructor");

    const controllerHttpMethods = Symbol.for("dip:controller:http-methods");

    for (const controllerMethod of controllerMehods) {
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
