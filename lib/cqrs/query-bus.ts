import { Injectable } from "../injectable";
import { QUERY_HANDLER_METADATA } from "./decorators/query-handler.decorator";
import type { IQuery, IQueryHandler } from "./interfaces/query.interface";
import { CqrsError } from "../errors";

/**
 * Bus for dispatching queries to their respective handlers.
 */
@Injectable()
export class QueryBus {
	private handlers = new Map<any, IQueryHandler>();

	/**
	 * Registers a list of query handlers.
	 * @param handlers Array of query handler instances.
	 */
	register(handlers: IQueryHandler[]) {
		handlers.forEach((handler) => {
			const query = Reflect.getMetadata(
				QUERY_HANDLER_METADATA,
				handler.constructor,
			);
			if (query) {
				this.handlers.set(query, handler);
			}
		});
	}

	/**
	 * Executes a query and returns the result.
	 * @param query The query instance to execute.
	 * @returns The result of the query execution.
	 * @throws CqrsError if no handler is found for the query.
	 */
	async execute<T extends IQuery, R = any>(query: T): Promise<R> {
		const queryType = query.constructor;
		const handler = this.handlers.get(queryType);
		if (!handler) {
			throw new CqrsError(
				`No handler found for query: ${queryType.name}`,
				`Ensure that a handler for ${queryType.name} is registered in your module's providers and decorated with @QueryHandler(${queryType.name}).`,
			);
		}
		return handler.execute(query);
	}
}
