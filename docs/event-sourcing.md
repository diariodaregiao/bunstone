# Event Sourcing

Bunstone ships an event-sourcing layer built on top of the SQL module: an `AggregateRoot` base class, an append-only `EventStore` (`SqlEventStore`) with optimistic concurrency and snapshots, and an `EventSourcedRepository` that rebuilds aggregates by replaying their events.

## Registration

`EventSourcingModule` needs `SqlModule` to be registered too. Both are global.

```ts
import { Module, SqlModule, EventSourcingModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    SqlModule.register({
      adapter: "mysql",
      hostname: "localhost",
      port: 3306,
      username: "root",
      password: "secret",
      database: "app",
    }),
    EventSourcingModule.register(),
  ],
})
export class AppModule {}
```

On startup the store creates two tables if they do not exist: `events` (composite primary key `stream_id + version`) and `snapshots`.

## Aggregates

Extend `AggregateRoot`. Mutations call the protected `apply(event)`, which invokes your `when(event)` reducer, records the event as uncommitted, and bumps the version. Domain events are plain objects carrying a `type` field.

```ts
import { AggregateRoot } from "@grupodiariodaregiao/bunstone";

interface Deposited { type: "Deposited"; amount: number }
interface Withdrawn { type: "Withdrawn"; amount: number }
type AccountEvent = Deposited | Withdrawn;

export class Account extends AggregateRoot {
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
```

`AggregateRoot` exposes:

- `apply(event)` — protected; apply and record a new event.
- `when(event)` — abstract; your reducer that mutates state from an event.
- `loadFromHistory(events)` — replay past events to rebuild state (does not mark them uncommitted).
- `commit()` — clear the uncommitted events after persisting.
- `version` — number of events applied.
- `uncommittedEvents` — events applied since the last commit.

## Repository

`EventSourcedRepository` takes the store and a factory for empty aggregates. Resolve the store with the `EVENT_STORE` token.

```ts
import { EventSourcedRepository, EVENT_STORE } from "@grupodiariodaregiao/bunstone";
import type { EventStore } from "@grupodiariodaregiao/bunstone";

const store = app.resolve<EventStore>(EVENT_STORE);
const accounts = new EventSourcedRepository(store, () => new Account());

const account = new Account();
account.deposit(100);
account.withdraw(30);
await accounts.save("acc-1", account);

const rebuilt = await accounts.load("acc-1");
console.log(rebuilt?.balance); // 70
console.log(rebuilt?.version); // 2
```

- `save(streamId, aggregate)` — appends the aggregate's uncommitted events (at its expected version) and commits. A no-op when there is nothing uncommitted.
- `load(streamId)` — reads the stream and replays it into a fresh aggregate; returns `null` if the stream has no events.

## Event store

`SqlEventStore` implements the `EventStore` interface:

- `append(streamId, events, expectedVersion)` — appends events in a transaction. If the stream's current version differs from `expectedVersion`, it throws a concurrency conflict (optimistic concurrency, enforced by the composite primary key).
- `read(streamId)` — returns the ordered event records.
- `saveSnapshot(snapshot)` / `loadSnapshot(streamId)` — store and retrieve a `{ streamId, version, state }` snapshot to avoid replaying long streams.

```ts
await store.saveSnapshot({ streamId: "acc-1", version: 3, state: { balance: 70 } });
const snapshot = await store.loadSnapshot<{ balance: number }>("acc-1");
```
