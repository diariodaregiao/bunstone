import type { DynamicModule } from "@/core/module";
import { EVENT_STORE, type EventStore } from "./event-store";
import { SqlEventStore } from "./sql-event-store";

export class EventSourcingModule {
	static register(): DynamicModule {
		return {
			module: EventSourcingModule,
			global: true,
			providers: [
				SqlEventStore,
				{
					provide: EVENT_STORE,
					useFactory: (store: EventStore) => store,
					inject: [SqlEventStore],
				},
			],
		};
	}
}
