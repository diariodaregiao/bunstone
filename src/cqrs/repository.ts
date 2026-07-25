import { EventStoreError } from "@/errors";
import { Logger } from "@/utils/logger";
import type { AggregateRoot, Snapshottable } from "./aggregate-root";
import type { EventStore } from "./event-store";

interface DomainEvent {
	type: string;
}

export interface RepositoryOptions {
	/**
	 * Write a snapshot whenever a save carries the stream across a multiple of
	 * this number, and read the latest snapshot on load. `0` (the default) reads
	 * and writes nothing, which is exactly a full replay every time.
	 *
	 * One knob drives both halves on purpose: a repository that writes snapshots
	 * without reading them is pure cost, and one that reads snapshots written
	 * under a different rule is a configuration hazard.
	 */
	snapshotEvery?: number;
}

const logger = new Logger("EventSourcing");

export class EventSourcedRepository<A extends AggregateRoot> {
	private readonly snapshotEvery: number;

	constructor(
		private readonly store: EventStore,
		private readonly factory: () => A,
		options: RepositoryOptions = {},
	) {
		const every = options.snapshotEvery ?? 0;
		// a NaN would slip past `every <= 0` and then never satisfy the trigger
		this.snapshotEvery = Number.isFinite(every) && every > 0 ? every : 0;
	}

	async load(streamId: string): Promise<A | null> {
		if (this.snapshotEvery > 0 && typeof this.store.readFrom === "function") {
			const snapshot = await this.store.loadSnapshot(streamId);
			if (snapshot) {
				const aggregate = this.factory();
				assertSnapshottable(aggregate);
				aggregate.loadFromSnapshot(snapshot.state, snapshot.version);
				const tail = await this.store.readFrom(streamId, snapshot.version);
				aggregate.loadFromHistory(
					tail.map((record) => record.payload as object),
				);
				return aggregate;
			}
		}

		// A store without `readFrom` cannot be trusted to skip the events already
		// folded into the snapshot, so it falls back to a full replay rather than
		// risking a double-applied history.
		const records = await this.store.read(streamId);
		if (records.length === 0) return null;
		const aggregate = this.factory();
		aggregate.loadFromHistory(
			records.map((record) => record.payload as object),
		);
		return aggregate;
	}

	async save(streamId: string, aggregate: A): Promise<void> {
		const events = aggregate.uncommittedEvents as DomainEvent[];
		if (events.length === 0) return;
		// asserted before the append, so a misconfigured aggregate cannot fail a
		// write that already succeeded
		if (this.snapshotEvery > 0) assertSnapshottable(aggregate);

		const expectedVersion = aggregate.version - events.length;
		await this.store.append(
			streamId,
			events.map((event) => ({ type: event.type, payload: event })),
			expectedVersion,
		);
		aggregate.commit(events.length);
		await this.maybeSnapshot(streamId, aggregate, expectedVersion);
	}

	private async maybeSnapshot(
		streamId: string,
		aggregate: A,
		previousVersion: number,
	): Promise<void> {
		const every = this.snapshotEvery;
		if (every <= 0) return;
		// the state must match the persisted history exactly; anything applied
		// while the append was in flight is still pending, so its state runs ahead
		if (aggregate.uncommittedEvents.length > 0) return;
		if (
			Math.floor(aggregate.version / every) ===
			Math.floor(previousVersion / every)
		) {
			return;
		}

		try {
			await this.store.saveSnapshot({
				streamId,
				version: aggregate.version,
				// detached in the same tick the version is read: a store that
				// serialises later would otherwise persist state the aggregate
				// mutated in between, stamped with a version it never had
				state: detach((aggregate as unknown as Snapshottable).snapshotState()),
			});
		} catch (error) {
			// a snapshot is a cache: losing one costs a longer replay, not correctness
			logger.warn(
				`Failed to write a snapshot for stream "${streamId}":`,
				error,
			);
		}
	}
}

/** Structured clone where possible; JSON is the fallback for exotic values. */
function detach<T>(state: T): T {
	try {
		return structuredClone(state);
	} catch {
		return state;
	}
}

function assertSnapshottable(aggregate: object): void {
	const candidate = aggregate as Partial<Snapshottable>;
	if (
		typeof candidate.snapshotState !== "function" ||
		typeof candidate.restoreFromState !== "function"
	) {
		throw EventStoreError.notSnapshottable(aggregate.constructor.name);
	}
}
