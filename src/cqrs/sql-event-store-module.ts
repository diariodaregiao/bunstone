import type { DynamicModule } from "@/core/module";
import { EVENT_STORE, provideEventStore } from "./event-store";
import { SqlEventStore } from "./sql-event-store";

/** Requires `SqlModule.register(...)` in the same application. */
export class SqlEventStoreModule {
	static register(): DynamicModule {
		return {
			module: SqlEventStoreModule,
			global: true,
			providers: provideEventStore(SqlEventStore),
			exports: [EVENT_STORE, SqlEventStore],
		};
	}
}
