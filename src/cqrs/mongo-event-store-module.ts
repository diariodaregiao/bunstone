import { InjectionToken } from "@/core/injectable";
import { FRAMEWORK_PREFLIGHT, type FrameworkPreflight } from "@/core/lifecycle";
import type { DynamicModule } from "@/core/module";
import { MongoService } from "@/database/mongo.service";
import { ConfigurationError } from "@/errors";
import { EVENT_STORE, provideEventStore } from "./event-store";
import {
	MONGO_EVENT_STORE_OPTIONS,
	MongoEventStore,
	type MongoEventStoreOptions,
} from "./mongo-event-store";

/** Requires `MongoModule.register(...)` in the same application. */
export class MongoEventStoreModule {
	static register(options: MongoEventStoreOptions = {}): DynamicModule {
		return {
			module: MongoEventStoreModule,
			global: true,
			providers: [
				{ provide: MONGO_EVENT_STORE_OPTIONS, useValue: options },
				...provideEventStore(MongoEventStore),
				{ provide: MONGO_EVENT_STORE_PREFLIGHT, useValue: preflight },
			],
			exports: [MONGO_EVENT_STORE_OPTIONS, EVENT_STORE, MongoEventStore],
		};
	}
}

const MONGO_EVENT_STORE_PREFLIGHT = new InjectionToken<FrameworkPreflight>(
	"MongoEventStorePreflight",
);

/** Reported before instantiation, naming the module the user forgot. */
const preflight: FrameworkPreflight = {
	[FRAMEWORK_PREFLIGHT](container) {
		if (!container.has(MongoService)) {
			throw ConfigurationError.missingModule(
				"MongoEventStoreModule",
				"MongoModule.register(...)",
			);
		}
	},
};
