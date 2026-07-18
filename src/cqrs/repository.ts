import type { AggregateRoot } from "./aggregate-root";
import type { EventStore } from "./event-store";

interface DomainEvent {
	type: string;
}

export class EventSourcedRepository<A extends AggregateRoot> {
	constructor(
		private readonly store: EventStore,
		private readonly factory: () => A,
	) {}

	async load(streamId: string): Promise<A | null> {
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
		const expectedVersion = aggregate.version - events.length;
		await this.store.append(
			streamId,
			events.map((event) => ({ type: event.type, payload: event })),
			expectedVersion,
		);
		aggregate.commit();
	}
}
