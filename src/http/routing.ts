import "reflect-metadata";
import type { Constructor } from "@/core/injectable";
import type { HttpMethod } from "./types";

export const CONTROLLER_METADATA = "bunstone:controller";
export const ROUTES_METADATA = "bunstone:routes";
export const SET_HEADER_METADATA = "bunstone:set-header";

export interface RouteDefinition {
	method: HttpMethod;

	path: string;

	handlerName: string;
}

export function normalizePath(path: string): string {
	if (!path || path === "/") return "/";
	const withLeading = path.startsWith("/") ? path : `/${path}`;
	return withLeading.length > 1 && withLeading.endsWith("/")
		? withLeading.slice(0, -1)
		: withLeading;
}

export function joinPaths(base: string, sub: string): string {
	const b = normalizePath(base);
	const s = normalizePath(sub);
	if (s === "/") return b;
	if (b === "/") return s;
	return `${b}${s}`;
}

export function Controller(path = "/"): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(CONTROLLER_METADATA, normalizePath(path), target);
	};
}

function methodDecorator(method: HttpMethod) {
	return (path = "/"): MethodDecorator =>
		(target, propertyKey) => {
			const ctor = target.constructor as Constructor;
			const routes: RouteDefinition[] =
				Reflect.getOwnMetadata(ROUTES_METADATA, ctor) ?? [];
			routes.push({
				method,
				path: normalizePath(path),
				handlerName: String(propertyKey),
			});
			Reflect.defineMetadata(ROUTES_METADATA, routes, ctor);
		};
}

export const Get = methodDecorator("GET");
export const Post = methodDecorator("POST");
export const Put = methodDecorator("PUT");
export const Patch = methodDecorator("PATCH");
export const Delete = methodDecorator("DELETE");
export const Head = methodDecorator("HEAD");
export const Options = methodDecorator("OPTIONS");

export function SetHeader(name: string, value: string): MethodDecorator {
	return (target, propertyKey) => {
		const headers: Record<string, string> =
			Reflect.getOwnMetadata(
				SET_HEADER_METADATA,
				target,
				propertyKey as string,
			) ?? {};
		headers[name] = value;
		Reflect.defineMetadata(
			SET_HEADER_METADATA,
			headers,
			target,
			propertyKey as string,
		);
	};
}

export function isController(target: Constructor): boolean {
	return Reflect.hasMetadata(CONTROLLER_METADATA, target);
}

export function getControllerPath(controller: Constructor): string {
	return Reflect.getMetadata(CONTROLLER_METADATA, controller) ?? "/";
}

export function getRoutes(controller: Constructor): RouteDefinition[] {
	return Reflect.getOwnMetadata(ROUTES_METADATA, controller) ?? [];
}

export function getSetHeaders(
	controller: Constructor,
	handlerName: string,
): Record<string, string> {
	return (
		Reflect.getOwnMetadata(
			SET_HEADER_METADATA,
			controller.prototype,
			handlerName,
		) ?? {}
	);
}
