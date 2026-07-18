import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export const COMMAND_HANDLER_METADATA = "bunstone:command-handler";
export const QUERY_HANDLER_METADATA = "bunstone:query-handler";
export const EVENT_HANDLER_METADATA = "bunstone:event-handler";

export function CommandHandler(command: Constructor): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
	};
}

export function QueryHandler(query: Constructor): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
	};
}

export function EventHandler(event: Constructor): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(EVENT_HANDLER_METADATA, event, target);
	};
}

export function getCommandHandlerTarget(
	handler: Constructor,
): Constructor | undefined {
	return Reflect.getOwnMetadata(COMMAND_HANDLER_METADATA, handler);
}

export function getQueryHandlerTarget(
	handler: Constructor,
): Constructor | undefined {
	return Reflect.getOwnMetadata(QUERY_HANDLER_METADATA, handler);
}

export function getEventHandlerTarget(
	handler: Constructor,
): Constructor | undefined {
	return Reflect.getOwnMetadata(EVENT_HANDLER_METADATA, handler);
}
