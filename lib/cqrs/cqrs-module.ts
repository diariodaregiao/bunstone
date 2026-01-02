import { Module } from "../module";
import { CommandBus } from "./command-bus";
import { QueryBus } from "./query-bus";
import { EventBus } from "./event-bus";

@Module({
  providers: [CommandBus, QueryBus, EventBus],
  exports: [CommandBus, QueryBus, EventBus],
})
export class CqrsModule {}
