import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export const API_TAGS_METADATA = "bunstone:api-tags";
export const API_OPERATION_METADATA = "bunstone:api-operation";
export const API_RESPONSE_METADATA = "bunstone:api-response";

export interface ApiOperationInfo {
	summary?: string;
	description?: string;
}

export interface ApiResponseInfo {
	status: number;
	description?: string;
}

export function ApiTags(...tags: string[]): ClassDecorator & MethodDecorator {
	return ((target: object, propertyKey?: string | symbol) => {
		if (propertyKey === undefined) {
			Reflect.defineMetadata(API_TAGS_METADATA, tags, target);
		} else {
			Reflect.defineMetadata(API_TAGS_METADATA, tags, target, propertyKey);
		}
	}) as ClassDecorator & MethodDecorator;
}

export function ApiOperation(info: ApiOperationInfo): MethodDecorator {
	return (target, propertyKey) => {
		Reflect.defineMetadata(
			API_OPERATION_METADATA,
			info,
			target,
			propertyKey as string,
		);
	};
}

export function ApiResponse(info: ApiResponseInfo): MethodDecorator {
	return (target, propertyKey) => {
		const existing: ApiResponseInfo[] =
			Reflect.getOwnMetadata(
				API_RESPONSE_METADATA,
				target,
				propertyKey as string,
			) ?? [];
		existing.push(info);
		Reflect.defineMetadata(
			API_RESPONSE_METADATA,
			existing,
			target,
			propertyKey as string,
		);
	};
}

export function getControllerTags(controller: Constructor): string[] {
	return Reflect.getMetadata(API_TAGS_METADATA, controller) ?? [];
}

export function getRouteTags(
	controller: Constructor,
	handlerName: string,
): string[] {
	return (
		Reflect.getOwnMetadata(
			API_TAGS_METADATA,
			controller.prototype,
			handlerName,
		) ?? []
	);
}

export function getApiOperation(
	controller: Constructor,
	handlerName: string,
): ApiOperationInfo | undefined {
	return Reflect.getOwnMetadata(
		API_OPERATION_METADATA,
		controller.prototype,
		handlerName,
	);
}

export function getApiResponses(
	controller: Constructor,
	handlerName: string,
): ApiResponseInfo[] {
	return (
		Reflect.getOwnMetadata(
			API_RESPONSE_METADATA,
			controller.prototype,
			handlerName,
		) ?? []
	);
}
