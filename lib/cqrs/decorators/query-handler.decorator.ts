import "reflect-metadata";

export const QUERY_HANDLER_METADATA = "dip:cqrs:query-handler";

export const QueryHandler = (query: any): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
  };
};
