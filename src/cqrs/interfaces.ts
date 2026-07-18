import type { Constructor } from "@/core/injectable";

export interface ICommandHandler<TCommand = unknown, TResult = unknown> {
	execute(command: TCommand): Promise<TResult> | TResult;
}

export interface IQueryHandler<TQuery = unknown, TResult = unknown> {
	execute(query: TQuery): Promise<TResult> | TResult;
}

export interface IEventHandler<TEvent = unknown> {
	handle(event: TEvent): Promise<void> | void;
}

export type MessageType = Constructor;
