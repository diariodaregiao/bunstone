import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { AggregateRoot, type Snapshottable } from "@/cqrs/aggregate-root";
import { EVENT_STORE, type EventStore } from "@/cqrs/event-store";
import { MongoEventStoreModule } from "@/cqrs/mongo-event-store-module";
import { EventSourcedRepository } from "@/cqrs/repository";
import { MongoModule } from "@/database/mongo-module";
import { EventStoreError } from "@/errors";
import { MONGO_URI, mongoReachable } from "../support/services";

const reachable = await mongoReachable();
const DATABASE = `bunstone_test_${crypto.randomUUID().slice(0, 8)}`;

interface AccountState {
	balance: number;
}

class Account extends AggregateRoot implements Snapshottable<AccountState> {
	balance = 0;

	add(amount: number) {
		this.apply({ type: "Added", amount });
	}

	protected when(event: object): void {
		const added = event as { type: string; amount: number };
		if (added.type === "Added") this.balance += added.amount;
	}

	snapshotState(): AccountState {
		return { balance: this.balance };
	}

	restoreFromState(state: AccountState): void {
		this.balance = state.balance;
	}
}

@Module({
	imports: [
		MongoModule.register({ uri: MONGO_URI, database: DATABASE }),
		MongoEventStoreModule.register(),
	],
})
class AppModule {}

let app: Application;
let store: EventStore;

beforeAll(async () => {
	if (!reachable) return;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	store = app.resolve<EventStore>(EVENT_STORE);
});

afterAll(async () => {
	if (!reachable) return;
	const { MongoClient } = await import("mongodb");
	const client = new MongoClient(MONGO_URI);
	await client.connect();
	await client.db(DATABASE).dropDatabase();
	await client.close();
	await app.close();
});

function streamId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

describe.skipIf(!reachable)("MongoEventStore", () => {
	it("appends and reads a stream in order", async () => {
		const id = streamId("order");
		await store.append(
			id,
			[
				{ type: "A", payload: { n: 1 } },
				{ type: "B", payload: { n: 2 } },
			],
			0,
		);
		await store.append(id, [{ type: "C", payload: { n: 3 } }], 2);

		const records = await store.read(id);

		expect(records.map((record) => record.version)).toEqual([1, 2, 3]);
		expect(records.map((record) => record.type)).toEqual(["A", "B", "C"]);
		expect(records[2]?.payload).toEqual({ n: 3 });
	});

	it("rejects a stale expected version", async () => {
		const id = streamId("stale");
		await store.append(id, [{ type: "A", payload: {} }], 0);

		await expect(
			store.append(id, [{ type: "B", payload: {} }], 0),
		).rejects.toThrow(EventStoreError);
	});

	it("lets exactly one concurrent writer win", async () => {
		const id = streamId("race");
		const results = await Promise.allSettled(
			[0, 1, 2].map(() => store.append(id, [{ type: "A", payload: {} }], 0)),
		);

		const ok = results.filter((result) => result.status === "fulfilled");
		const conflicts = results.filter(
			(result) =>
				result.status === "rejected" &&
				result.reason instanceof EventStoreError,
		);

		expect(ok).toHaveLength(1);
		expect(conflicts).toHaveLength(2);
		expect(await store.read(id)).toHaveLength(1);
	});

	it("keeps stream ids that differ only in case apart", async () => {
		const id = streamId("Case");
		await store.append(id, [{ type: "A", payload: { who: "upper" } }], 0);

		// the SQL backend merged these under MySQL's default collation
		expect(await store.read(id.toLowerCase())).toHaveLength(0);
		expect(await store.read(id)).toHaveLength(1);
	});

	it("reads only the tail after a version", async () => {
		const id = streamId("tail");
		await store.append(
			id,
			[
				{ type: "A", payload: {} },
				{ type: "B", payload: {} },
			],
			0,
		);
		await store.append(id, [{ type: "C", payload: {} }], 2);

		const tail = await store.readFrom?.(id, 2);

		expect(tail?.map((record) => record.version)).toEqual([3]);
	});

	it("keeps the newest snapshot when a stale one is written after it", async () => {
		const id = streamId("snap");
		await store.saveSnapshot({ streamId: id, version: 10, state: { v: 10 } });
		await store.saveSnapshot({ streamId: id, version: 4, state: { v: 4 } });

		expect(await store.loadSnapshot(id)).toEqual({
			streamId: id,
			version: 10,
			state: { v: 10 },
		});
	});

	it("refuses a commit larger than the document limit, before writing", async () => {
		// a store with a tiny limit, so the guard is exercised rather than the
		// 16 MiB BSON cap
		@Module({
			imports: [
				MongoModule.register({ uri: MONGO_URI, database: DATABASE }),
				MongoEventStoreModule.register({ maxCommitBytes: 1024 }),
			],
		})
		class LimitedModule {}

		const limited = await Application.create(LimitedModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const small = limited.resolve<EventStore>(EVENT_STORE);
		const id = streamId("big");

		await expect(
			small.append(
				id,
				[{ type: "Big", payload: { blob: "x".repeat(4096) } }],
				0,
			),
		).rejects.toThrow(/over the 1024 byte limit/);

		// rejected before any write, so the stream is untouched
		expect(await small.read(id)).toHaveLength(0);
		await limited.close();
	});

	it("rebuilds an aggregate from a snapshot plus the tail", async () => {
		const id = streamId("rebuild");
		const repository = new EventSourcedRepository(store, () => new Account(), {
			snapshotEvery: 2,
		});

		for (let i = 0; i < 5; i++) {
			const account = (await repository.load(id)) ?? new Account();
			account.add(10);
			await repository.save(id, account);
		}

		const snapshot = await store.loadSnapshot<AccountState>(id);
		const rebuilt = await repository.load(id);

		expect(snapshot?.version).toBe(4);
		expect(rebuilt?.balance).toBe(50);
		expect(rebuilt?.version).toBe(5);
		expect(rebuilt?.uncommittedEvents).toHaveLength(0);
	});
});
