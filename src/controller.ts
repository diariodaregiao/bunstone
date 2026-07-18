import "reflect-metadata";
import { Injectable } from "./injectable";

/**
 * Decorator that marks a class as an HTTP controller.
 * Controllers are responsible for handling incoming requests and returning responses.
 *
 * @param pathname The base path for all routes defined within this controller. Defaults to "/".
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UserController {}
 * ```
 */
export function Controller(pathname: string = "/"): any {
	if (!pathname.startsWith("/")) {
		pathname = `/${pathname}`;
	}

	return (target: any) => {
		Injectable()(target);

		const controllerMethods = Object.getOwnPropertyNames(
			target.prototype,
		).filter((method) => method !== "constructor");

		const controllerHttpMethods = Symbol.for("dip:controller:http-methods");

		for (const controllerMethod of controllerMethods) {
			if (
				!target[controllerHttpMethods] ||
				target[controllerHttpMethods].length === 0
			) {
				target[controllerHttpMethods] = [];
			}

			const metadata = Reflect.getMetadata(
				"dip:http-method",
				target.prototype[controllerMethod],
			);

			if (metadata) {
				const [httpMethod, pathname] = metadata.split(" ");

				target[controllerHttpMethods].push({
					httpMethod,
					pathname,
					methodName: controllerMethod,
				});
			}
		}

		Reflect.defineMetadata("dip:controller", "is_controller", target);
		Reflect.defineMetadata("dip:controller:pathname", pathname, target);
	};
}
