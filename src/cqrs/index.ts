export type { Snapshottable } from "./aggregate-root";
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
export {
	assertEventStoreWiring,
	EventSourcingModule,
} from "./event-sourcing-module";
export {
	EVENT_STORE,
	type EventInput,
	type EventRecord,
	type EventStore,
	provideEventStore,
	type Snapshot,
} from "./event-store";
export type {
	ICommandHandler,
	IEventHandler,
	IQueryHandler,
} from "./interfaces";
export {
	MONGO_EVENT_STORE_OPTIONS,
	MongoEventStore,
	type MongoEventStoreOptions,
} from "./mongo-event-store";
export { MongoEventStoreModule } from "./mongo-event-store-module";
export { QueryBus } from "./query-bus";
export type { RepositoryOptions } from "./repository";
export { EventSourcedRepository } from "./repository";
export { SqlEventStore } from "./sql-event-store";
export { SqlEventStoreModule } from "./sql-event-store-module";
