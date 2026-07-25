import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { AggregateRoot } from "@/cqrs/aggregate-root";
import { EVENT_STORE, type EventStore } from "@/cqrs/event-store";
import { MongoEventStoreModule } from "@/cqrs/mongo-event-store-module";
import { EventSourcedRepository } from "@/cqrs/repository";
import { SqlEventStore } from "@/cqrs/sql-event-store";
import { SqlEventStoreModule } from "@/cqrs/sql-event-store-module";
import { SqlModule } from "@/database/sql-module";
import { EventStoreError } from "@/errors";
import { optionalImport } from "@/utils/optional-import";

const sqlite = { adapter: "sqlite" as const, filename: ":memory:" };

class Counter extends AggregateRoot {
	count = 0;

	bump() {
		this.apply({ type: "Bumped" });
	}

	protected when(event: object): void {
		if ((event as { type: string }).type === "Bumped") this.count++;
	}
}

describe("event store wiring", () => {
	it("names the missing connection module instead of a raw token", async () => {
		@Module({ imports: [MongoEventStoreModule.register()] })
		class MissingMongo {}

		await expect(
			Application.create(MissingMongo, {
				gracefulShutdown: false,
				logStartup: false,
			}),
		).rejects.toThrow(/MongoModule\.register/);   // the fix is in the message
	});

	it("resolves EVENT_STORE and the implementation to one instance", async () => {
		@Module({
			imports: [SqlModule.register(sqlite), SqlEventStoreModule.register()],
		})
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});

		// two tokens, one lifecycle: a second construction would connect twice
		expect(app.resolve(EVENT_STORE)).toBe(app.resolve(SqlEventStore));
		await app.close();
	});

	it("keeps the deprecated EventSourcingModule working", async () => {
		const { EventSourcingModule } = await import(
			"@/cqrs/event-sourcing-module"
		);

		@Module({
			imports: [SqlModule.register(sqlite), EventSourcingModule.register()],
		})
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});

		expect(app.resolve(EVENT_STORE)).toBeInstanceOf(SqlEventStore);
		await app.close();
	});
});

describe("snapshots", () => {
	async function bootStore(): Promise<{ app: Application; store: EventStore }> {
		@Module({
			imports: [SqlModule.register(sqlite), SqlEventStoreModule.register()],
		})
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		return { app, store: app.resolve<EventStore>(EVENT_STORE) };
	}

	it("refuses to snapshot an aggregate that cannot be restored", async () => {
		const { app, store } = await bootStore();
		const repository = new EventSourcedRepository(store, () => new Counter(), {
			snapshotEvery: 1,
		});
		const counter = new Counter();
		counter.bump();

		await expect(repository.save("c-1", counter)).rejects.toThrow(
			EventStoreError,
		);
		// rejected before the append, so nothing was written
		expect(await store.read("c-1")).toHaveLength(0);
		await app.close();
	});

	it("replays the whole stream when snapshotting is off", async () => {
		const { app, store } = await bootStore();
		const repository = new EventSourcedRepository(store, () => new Counter());

		const counter = new Counter();
		counter.bump();
		counter.bump();
		await repository.save("c-2", counter);

		expect(await store.loadSnapshot("c-2")).toBeNull();
		expect((await repository.load("c-2"))?.count).toBe(2);
		await app.close();
	});
});

describe("optionalImport", () => {
	it("reports a missing driver as an ImportError with an install hint", async () => {
		await expect(
			optionalImport(
				() => import(`${"definitely-not-installed"}-pkg`),
				"definitely-not-installed-pkg",
				"SomeModule",
			),
		).rejects.toThrow(/bun add definitely-not-installed-pkg/);
	});

	it("rethrows an unrelated failure untouched", async () => {
		const boom = new Error("the driver blew up while evaluating");

		await expect(
			optionalImport(
				() => Promise.reject(boom),
				"definitely-not-installed-pkg",
				"SomeModule",
			),
		).rejects.toThrow(boom);
	});
});
