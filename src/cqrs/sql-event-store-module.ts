import type { Provider } from "@/core/container";
import { InjectionToken } from "@/core/injectable";
import { FRAMEWORK_PREFLIGHT, type FrameworkPreflight } from "@/core/lifecycle";
import type { DynamicModule } from "@/core/module";
import { SqlService } from "@/database/sql.service";
import { ConfigurationError } from "@/errors";
import { EVENT_STORE, provideEventStore } from "./event-store";
import { SqlEventStore } from "./sql-event-store";

/** Requires `SqlModule.register(...)` in the same application. */
export class SqlEventStoreModule {
	static register(): DynamicModule {
		return {
			module: SqlEventStoreModule,
			global: true,
			providers: provideSqlEventStore(),
			exports: [EVENT_STORE, SqlEventStore],
		};
	}
}

/** Reported before instantiation, naming the module the user forgot. */
export const sqlEventStorePreflight: FrameworkPreflight = {
	[FRAMEWORK_PREFLIGHT](container) {
		if (!container.has(SqlService)) {
			throw ConfigurationError.missingModule(
				"SqlEventStoreModule",
				"SqlModule.register(...)",
			);
		}
	},
};

const SQL_EVENT_STORE_PREFLIGHT = new InjectionToken<FrameworkPreflight>(
	"SqlEventStorePreflight",
);

/** The SQL store's providers, with the check that its connection is registered. */
export function provideSqlEventStore(): Provider[] {
	return [
		...provideEventStore(SqlEventStore),
		{ provide: SQL_EVENT_STORE_PREFLIGHT, useValue: sqlEventStorePreflight },
	];
}
