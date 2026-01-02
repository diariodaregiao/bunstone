import { Injectable } from "../injectable";
import { QUERY_HANDLER_METADATA } from "./decorators/query-handler.decorator";
import type { IQuery, IQueryHandler } from "./interfaces/query.interface";

@Injectable()
export class QueryBus {
  private handlers = new Map<any, IQueryHandler>();

  register(handlers: IQueryHandler[]) {
    handlers.forEach((handler) => {
      const query = Reflect.getMetadata(QUERY_HANDLER_METADATA, handler.constructor);
      if (query) {
        this.handlers.set(query, handler);
      }
    });
  }

  async execute<T extends IQuery, R = any>(query: T): Promise<R> {
    const queryType = query.constructor;
    const handler = this.handlers.get(queryType);
    if (!handler) {
      throw new Error(`No handler found for query: ${queryType.name}`);
    }
    return handler.execute(query);
  }
}
