import { InjectionToken } from "@/core/injectable";

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
	saveSnapshot<TState>(snapshot: Snapshot<TState>): Promise<void>;
	loadSnapshot<TState>(streamId: string): Promise<Snapshot<TState> | null>;
}

export const EVENT_STORE = new InjectionToken<EventStore>("EventStore");
