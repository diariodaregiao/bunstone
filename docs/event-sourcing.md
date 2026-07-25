# Event Sourcing

Bunstone ships an event-sourcing layer with a pluggable store: an `AggregateRoot` base class, an append-only `EventStore` with optimistic concurrency and snapshots, and an `EventSourcedRepository` that rebuilds aggregates by replaying their events.

Two backends are included — **relational** (PostgreSQL, MySQL, MariaDB, SQLite) and **document** (MongoDB) — and you can plug in your own. Everything above the store, from the aggregate to the repository, is identical whichever you choose.

## Registration

A backend is two modules: the connection, and the store that uses it.

### Relational

```ts
import { Module, SqlEventStoreModule, SqlModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    SqlModule.register({
      adapter: "mariadb",
      hostname: "localhost",
      port: 3306,
      username: "root",
      password: "secret",
      database: "app",
    }),
    SqlEventStoreModule.register(),
  ],
})
export class AppModule {}
```

### MongoDB

The driver is an optional peer dependency — a project on another backend never installs it.

```bash
bun add mongodb
```

```ts
import { Module, MongoEventStoreModule, MongoModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    MongoModule.register("mongodb://localhost:27017/app"),
    MongoEventStoreModule.register(),
  ],
})
export class AppModule {}
```

`MongoEventStoreModule.register()` accepts `{ eventsCollection, snapshotsCollection, database, maxCommitBytes }`.

Registering a store without its connection module fails at startup naming the module you forgot, rather than reporting an unresolvable token.

> `EventSourcingModule.register()` still works and is an alias for the SQL backend. Prefer `SqlEventStoreModule.register()` in new code.

On startup the SQL store creates two tables if they do not exist: `events` (composite primary key `stream_id + version`) and `snapshots`. The Mongo store creates a unique index on `{ streamId, version }` with the `simple` collation.

The store adapts its bind-parameter style to the configured adapter, so the same code works on PostgreSQL (`$1, $2, …`) as on MySQL, MariaDB and SQLite (`?`).

On MySQL and MariaDB the key column is created with a binary collation — the server default is case-insensitive, which would merge two stream ids differing only in case into a single aggregate — and payloads use `LONGTEXT` rather than `TEXT`, which caps at 64 KB.

> **Upgrading:** `CREATE TABLE IF NOT EXISTS` cannot change a table that already exists. If your `events` table predates this, startup logs the exact `ALTER TABLE` statements to run.

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
- `commit(count?)` — drop the events that were persisted. `EventSourcedRepository` passes the number it appended, so an event applied while the append was in flight stays pending for the next save instead of being lost.
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
- `load(streamId)` — rebuilds the aggregate; returns `null` if the stream has no events.

## Snapshots

Replaying a long stream on every load gets expensive. A snapshot records the aggregate's state at a version so a load only has to replay what happened after it.

Turn it on with `snapshotEvery`, and make the aggregate `Snapshottable`:

```ts
import type { Snapshottable } from "@grupodiariodaregiao/bunstone";

interface AccountState { balance: number }

export class Account extends AggregateRoot implements Snapshottable<AccountState> {
  balance = 0;
  // ...deposit / withdraw / when as above

  snapshotState(): AccountState {
    return { balance: this.balance };
  }

  restoreFromState(state: AccountState): void {
    this.balance = state.balance;
  }
}
```

```ts
const accounts = new EventSourcedRepository(store, () => new Account(), {
  snapshotEvery: 100,
});
```

- `snapshotEvery: 0` (the default) — nothing is read or written, exactly a full replay every time.
- `snapshotEvery: n` — a snapshot is written on the save that carries the stream **across** a multiple of `n`, and `load` starts from the latest snapshot and replays only the tail.

One knob drives both halves on purpose: a repository that writes snapshots without reading them is pure cost, and one that reads snapshots written under a different rule is a configuration hazard. Configure every repository for a given stream identically.

Both methods are required. An aggregate with `snapshotState` but no `restoreFromState` would rehydrate empty and stamped with the snapshot's version — a silent corruption — so the repository rejects it with `BNS-ES-003` **before** appending anything.

`snapshotState()` must return a JSON-round-trippable value: `Date`, `Map`, `Set` and class instances do not survive the trip through either backend.

A snapshot is a cache. If writing one fails the save still succeeds and a warning is logged — you pay a longer replay, never a lost event.

## Choosing a backend

|  | Relational | MongoDB |
|---|---|---|
| Concurrency | `SELECT MAX(version)` plus a composite primary key | head check plus a unique index on `{streamId, version}` |
| Atomicity of a multi-event append | transaction | one document per commit — a torn append is structurally impossible |
| Topology requirements | none | none: works on a standalone `mongod`, no replica set needed |
| Payload limit | `LONGTEXT` on MySQL, unbounded elsewhere | 16 MB per commit; the store rejects at 15 MB with `BNS-ES-002` |

The Mongo store stores **one document per `append()`**, not per event. Multi-document transactions require a replica set, and an ordered `insertMany` that fails halfway leaves earlier events permanently committed with no rollback — replay would then produce a state that never legally existed. Batching the commit removes that failure mode on every topology.

## A custom store

`EventStore` is a plain interface, so any backend works:

```ts
import { EVENT_STORE, Injectable, Module, provideEventStore } from "@grupodiariodaregiao/bunstone";
import type { EventRecord, EventStore, Snapshot } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class InMemoryEventStore implements EventStore {
  private readonly streams = new Map<string, EventRecord[]>();
  // append / read / saveSnapshot / loadSnapshot
}

@Module({ providers: provideEventStore(InMemoryEventStore), exports: [EVENT_STORE] })
export class InMemoryEventStoreModule {}
```

`provideEventStore` registers the class under its own token and aliases `EVENT_STORE` to the *same instance*, so the store has one lifecycle rather than being constructed twice.

Implement the optional `readFrom(streamId, afterVersion)` to support snapshot-accelerated loads. A store without it still works — the repository falls back to a full replay rather than risk double-applying events already folded into the snapshot.

## Event store

`SqlEventStore` implements the `EventStore` interface:

- `append(streamId, events, expectedVersion)` — appends events in a transaction. If the stream's current version differs from `expectedVersion`, it throws `EventStoreError` (optimistic concurrency, ultimately enforced by the composite primary key). A conflict that only surfaces at insert time — two writers racing past the version check — is mapped to the same typed error, so `catch (e) { if (e instanceof EventStoreError) retry() }` covers both paths.
- `read(streamId)` — returns the ordered event records.
- `saveSnapshot(snapshot)` / `loadSnapshot(streamId)` — store and retrieve a `{ streamId, version, state }` snapshot.

> **Note:** snapshots are storage only. `EventSourcedRepository.load` always replays the full stream and does not consult them — take and read them yourself if you need to shorten a long replay.

```ts
await store.saveSnapshot({ streamId: "acc-1", version: 3, state: { balance: 70 } });
const snapshot = await store.loadSnapshot<{ balance: number }>("acc-1");
```
