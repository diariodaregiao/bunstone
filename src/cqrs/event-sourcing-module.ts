import type { Container } from "@/core/container";
import type { DynamicModule } from "@/core/module";
import { MongoService } from "@/database/mongo.service";
import { SqlService } from "@/database/sql.service";
import { ConfigurationError } from "@/errors";
import { EVENT_STORE, provideEventStore } from "./event-store";
import { MongoEventStore } from "./mongo-event-store";
import { SqlEventStore } from "./sql-event-store";

/**
 * @deprecated Register the backend explicitly: `SqlEventStoreModule.register()`
 * or `MongoEventStoreModule.register()`. This remains an alias for the SQL
 * backend so existing applications keep working unchanged.
 */
export class EventSourcingModule {
	static register(): DynamicModule {
		return {
			module: EventSourcingModule,
			global: true,
			providers: provideEventStore(SqlEventStore),
			exports: [EVENT_STORE, SqlEventStore],
		};
	}
}

/**
 * A store registered without its connection module resolves to a
 * `DependencyResolutionError` naming a token the user never wrote. Checked
 * before `instantiateAll()` so the message names the module they forgot.
 */
export function assertEventStoreWiring(container: Container): void {
	if (container.has(SqlEventStore) && !container.has(SqlService)) {
		throw ConfigurationError.missingModule(
			"SqlEventStoreModule",
			"SqlModule.register(...)",
		);
	}
	if (container.has(MongoEventStore) && !container.has(MongoService)) {
		throw ConfigurationError.missingModule(
			"MongoEventStoreModule",
			"MongoModule.register(...)",
		);
	}
}
