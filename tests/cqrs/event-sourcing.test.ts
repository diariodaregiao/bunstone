import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { AggregateRoot } from "@/cqrs/aggregate-root";
import { EventSourcingModule } from "@/cqrs/event-sourcing-module";
import { EVENT_STORE, type EventStore } from "@/cqrs/event-store";
import { EventSourcedRepository } from "@/cqrs/repository";
import { SqlModule } from "@/database/sql-module";

interface Deposited {
	type: "Deposited";
	amount: number;
}
interface Withdrawn {
	type: "Withdrawn";
	amount: number;
}
type AccountEvent = Deposited | Withdrawn;

class Account extends AggregateRoot {
	balance = 0;

	deposit(amount: number) {
		this.apply({ type: "Deposited", amount } satisfies Deposited);
	}
	withdraw(amount: number) {
		if (amount > this.balance) throw new Error("insufficient funds");
		this.apply({ type: "Withdrawn", amount } satisfies Withdrawn);
	}

	protected when(event: object): void {
		const e = event as AccountEvent;
		if (e.type === "Deposited") this.balance += e.amount;
		if (e.type === "Withdrawn") this.balance -= e.amount;
	}
}

@Module({
	imports: [
		SqlModule.register({ adapter: "sqlite", filename: ":memory:" }),
		EventSourcingModule.register(),
	],
})
class AppModule {}

let app: Application;
let store: EventStore;
let repo: EventSourcedRepository<Account>;

beforeEach(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	store = app.resolve<EventStore>(EVENT_STORE);
	repo = new EventSourcedRepository(store, () => new Account());
});

afterEach(async () => {
	await app.close();
});

describe("Event sourcing", () => {
	it("persists uncommitted events and rebuilds by replay", async () => {
		const account = new Account();
		account.deposit(100);
		account.withdraw(30);
		await repo.save("acc-1", account);

		const rebuilt = await repo.load("acc-1");
		expect(rebuilt?.balance).toBe(70);
		expect(rebuilt?.version).toBe(2);
	});

	it("appends across sessions with the correct expected version", async () => {
		const first = new Account();
		first.deposit(50);
		await repo.save("acc-2", first);

		const loaded = await repo.load("acc-2");
		loaded?.deposit(25);
		await repo.save("acc-2", loaded as Account);

		expect((await repo.load("acc-2"))?.balance).toBe(75);
	});

	it("enforces optimistic concurrency", async () => {
		await store.append(
			"acc-3",
			[{ type: "Deposited", payload: { amount: 10 } }],
			0,
		);
		await expect(
			store.append("acc-3", [{ type: "Deposited", payload: { amount: 5 } }], 0),
		).rejects.toThrow(/Concurrency conflict/);
	});

	it("returns null when loading an unknown stream", async () => {
		expect(await repo.load("missing")).toBeNull();
	});

	it("saves and loads a snapshot", async () => {
		await store.saveSnapshot({
			streamId: "acc-4",
			version: 3,
			state: { balance: 70 },
		});
		const snapshot = await store.loadSnapshot<{ balance: number }>("acc-4");
		expect(snapshot).toEqual({
			streamId: "acc-4",
			version: 3,
			state: { balance: 70 },
		});
	});
});
