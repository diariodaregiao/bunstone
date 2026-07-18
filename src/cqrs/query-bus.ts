import type { Constructor } from "@/core/injectable";
import { Injectable } from "@/core/injectable";
import { CqrsError } from "@/errors";
import type { IQueryHandler } from "./interfaces";

@Injectable()
export class QueryBus {
	private readonly handlers = new Map<Constructor, IQueryHandler>();

	register(query: Constructor, handler: IQueryHandler): void {
		this.handlers.set(query, handler);
	}

	async execute<TResult = unknown>(query: object): Promise<TResult> {
		const handler = this.handlers.get(query.constructor as Constructor);
		if (!handler) {
			throw CqrsError.noQueryHandler(query.constructor.name);
		}
		return (await handler.execute(query)) as TResult;
	}
}
