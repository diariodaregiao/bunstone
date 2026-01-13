import "reflect-metadata";

export const QUERY_HANDLER_METADATA = "dip:cqrs:query-handler";

/**
 * Decorator that marks a class as a query handler.
 * @param query The query class that this handler handles.
 */
export const QueryHandler = (query: any): any => {
  return (target: object, _context?: any) => {
    Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
  };
};
