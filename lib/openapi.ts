import "reflect-metadata";

export const API_TAGS_METADATA = "dip:openapi:tags";
export const API_OPERATION_METADATA = "dip:openapi:operation";
export const API_RESPONSE_METADATA = "dip:openapi:responses";
export const API_HEADERS_METADATA = "dip:openapi:headers";

/**
 * Decorator that adds tags to a controller or method for OpenAPI.
 * @param tags List of tags.
 */
export function ApiTags(...tags: string[]): any {
	return (target: any, propertyKey?: string | symbol, _descriptor?: any) => {
		// Stage 3 support
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			const context = propertyKey as any;
			if (context.kind === "class") {
				Reflect.defineMetadata(API_TAGS_METADATA, tags, target);
			} else if (context.kind === "method") {
				Reflect.defineMetadata(API_TAGS_METADATA, tags, target);
			}
			return;
		}

		if (propertyKey) {
			Reflect.defineMetadata(API_TAGS_METADATA, tags, target, propertyKey);
		} else {
			Reflect.defineMetadata(API_TAGS_METADATA, tags, target);
		}
	};
}

/**
 * Decorator that defines an operation summary and description for OpenAPI.
 * @param options Operation options.
 * @param options.summary A short summary of what the operation does.
 * @param options.description A verbose explanation of the operation behavior.
 */
export function ApiOperation(options: {
	summary?: string;
	description?: string;
}): any {
	return (
		target: any,
		propertyKey: string | symbol,
		_descriptor?: PropertyDescriptor,
	) => {
		// Stage 3 support
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			Reflect.defineMetadata(API_OPERATION_METADATA, options, target);
			return;
		}

		Reflect.defineMetadata(
			API_OPERATION_METADATA,
			options,
			target,
			propertyKey,
		);
	};
}

/**
 * Decorator that defines a response for OpenAPI.
 * @param options Response options.
 * @param options.status The HTTP status code.
 * @param options.description A short description of the response.
 * @param options.type Optional Zod schema or type for the response body.
 */
export function ApiResponse(options: {
	status: number;
	description: string;
	type?: any;
}): any {
	return (
		target: any,
		propertyKey: string | symbol,
		_descriptor?: PropertyDescriptor,
	) => {
		// Stage 3 support
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			const responses =
				Reflect.getMetadata(API_RESPONSE_METADATA, target) || [];
			responses.push(options);
			Reflect.defineMetadata(API_RESPONSE_METADATA, responses, target);
			return;
		}

		const responses =
			Reflect.getMetadata(API_RESPONSE_METADATA, target, propertyKey) || [];
		responses.push(options);
		Reflect.defineMetadata(
			API_RESPONSE_METADATA,
			responses,
			target,
			propertyKey,
		);
	};
}

/**
 * Decorator that defines a header for OpenAPI.
 * @param options Header options.
 */
export function ApiHeader(options: {
	name: string;
	description?: string;
	required?: boolean;
	schema?: any;
}): any {
	return (target: any, propertyKey?: string | symbol, _descriptor?: any) => {
		// Stage 3 support
		if (
			propertyKey &&
			typeof propertyKey === "object" &&
			"kind" in propertyKey
		) {
			const headers = Reflect.getMetadata(API_HEADERS_METADATA, target) || [];
			headers.push(options);
			Reflect.defineMetadata(API_HEADERS_METADATA, headers, target);
			return;
		}

		const headers =
			(propertyKey
				? Reflect.getMetadata(API_HEADERS_METADATA, target, propertyKey)
				: Reflect.getMetadata(API_HEADERS_METADATA, target)) || [];
		headers.push(options);
		if (propertyKey) {
			Reflect.defineMetadata(
				API_HEADERS_METADATA,
				headers,
				target,
				propertyKey,
			);
		} else {
			Reflect.defineMetadata(API_HEADERS_METADATA, headers, target);
		}
	};
}

/**
 * Decorator that defines multiple headers for OpenAPI.
 * @param headers List of header options.
 */
export function ApiHeaders(
	headers: {
		name: string;
		description?: string;
		required?: boolean;
		schema?: any;
	}[],
) {
	return (target: any, propertyKey?: string | symbol) => {
		headers.forEach((header) => {
			ApiHeader(header)(target, propertyKey);
		});
	};
}
