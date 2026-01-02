import "reflect-metadata";

export const API_TAGS_METADATA = "dip:openapi:tags";
export const API_OPERATION_METADATA = "dip:openapi:operation";
export const API_RESPONSE_METADATA = "dip:openapi:responses";

/**
 * Decorator that adds tags to a controller or method for OpenAPI.
 * @param tags List of tags.
 */
export function ApiTags(...tags: string[]) {
  return (target: any, propertyKey?: string | symbol) => {
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
}) {
  return (target: any, propertyKey: string | symbol) => {
    Reflect.defineMetadata(
      API_OPERATION_METADATA,
      options,
      target,
      propertyKey
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
}) {
  return (target: any, propertyKey: string | symbol) => {
    const responses =
      Reflect.getMetadata(API_RESPONSE_METADATA, target, propertyKey) || [];
    responses.push(options);
    Reflect.defineMetadata(
      API_RESPONSE_METADATA,
      responses,
      target,
      propertyKey
    );
  };
}
