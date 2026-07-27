import type { DynamicModule } from "@/core/module";
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
			],
			exports: [MONGO_EVENT_STORE_OPTIONS, EVENT_STORE, MongoEventStore],
		};
	}
}
