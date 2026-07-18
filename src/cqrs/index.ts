export { AggregateRoot } from "./aggregate-root";
export { CommandBus } from "./command-bus";
export { CqrsModule, wireCqrs } from "./cqrs-module";
export {
	CommandHandler,
	EventHandler,
	getCommandHandlerTarget,
	getEventHandlerTarget,
	getQueryHandlerTarget,
	QueryHandler,
} from "./decorators";
export { EventBus } from "./event-bus";
export { EventSourcingModule } from "./event-sourcing-module";
export {
	EVENT_STORE,
	type EventInput,
	type EventRecord,
	type EventStore,
	type Snapshot,
} from "./event-store";
export type {
	ICommandHandler,
	IEventHandler,
	IQueryHandler,
} from "./interfaces";
export { QueryBus } from "./query-bus";
export { EventSourcedRepository } from "./repository";
export { SqlEventStore } from "./sql-event-store";
