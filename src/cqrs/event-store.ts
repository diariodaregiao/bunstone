import type { Provider } from "@/core/container";
import { type Constructor, InjectionToken } from "@/core/injectable";

export interface EventInput {
	type: string;
	payload: unknown;
}

export interface EventRecord {
	streamId: string;
	version: number;
	type: string;
	payload: unknown;
	timestamp: string;
}

export interface Snapshot<TState = unknown> {
	streamId: string;
	version: number;
	state: TState;
}

export interface EventStore {
	append(
		streamId: string,
		events: EventInput[],
		expectedVersion: number,
	): Promise<void>;
	read(streamId: string): Promise<EventRecord[]>;
	/**
	 * Events strictly after `afterVersion`, ascending. Optional: a store that
	 * does not implement it opts out of snapshot-accelerated loads rather than
	 * risking a replay of events already folded into the snapshot.
	 */
	readFrom?(streamId: string, afterVersion: number): Promise<EventRecord[]>;
	saveSnapshot<TState>(snapshot: Snapshot<TState>): Promise<void>;
	loadSnapshot<TState>(streamId: string): Promise<Snapshot<TState> | null>;
}

export const EVENT_STORE = new InjectionToken<EventStore>("EventStore");

/**
 * The two providers every backend needs: the implementation under its own class
 * token, and `EVENT_STORE` aliased to that *same instance* — a second
 * construction would give the store two lifecycles and connect twice.
 */
export function provideEventStore(
	implementation: Constructor<EventStore>,
): Provider[] {
	return [
		implementation,
		{
			provide: EVENT_STORE,
			useFactory: (store: EventStore) => store,
			inject: [implementation],
		},
	];
}
