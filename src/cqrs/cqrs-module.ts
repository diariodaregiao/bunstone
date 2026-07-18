import { Module } from "../module";
import { CommandBus } from "./command-bus";
import { EventBus } from "./event-bus";
import { QueryBus } from "./query-bus";

@Module({
	providers: [CommandBus, QueryBus, EventBus],
	exports: [CommandBus, QueryBus, EventBus],
	global: true,
})
export class CqrsModule {}
