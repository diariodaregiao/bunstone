/**
 * An aggregate that can be snapshotted. Both halves are required: writing state
 * without being able to restore it would rehydrate an empty aggregate stamped
 * with the snapshot's version — a silent, permanent corruption.
 */
export interface Snapshottable<TState = unknown> {
	snapshotState(): TState;
	restoreFromState(state: TState): void;
}

export abstract class AggregateRoot {
	private currentVersion = 0;
	private readonly pending: object[] = [];

	get version(): number {
		return this.currentVersion;
	}

	get uncommittedEvents(): object[] {
		return [...this.pending];
	}

	protected apply(event: object): void {
		this.when(event);
		this.pending.push(event);
		this.currentVersion++;
	}

	/**
	 * Restores from a snapshot without replaying it: `when` is not invoked and
	 * nothing is marked uncommitted, so the result is indistinguishable from a
	 * full replay up to `version`.
	 */
	loadFromSnapshot(state: unknown, version: number): void {
		(this as unknown as Snapshottable).restoreFromState(state);
		this.currentVersion = version;
	}

	loadFromHistory(events: readonly object[]): void {
		for (const event of events) {
			this.when(event);
			this.currentVersion++;
		}
	}

	// Only the events that were actually persisted are dropped; anything applied
	// while the append was in flight stays pending for the next save.
	commit(count: number = this.pending.length): void {
		this.pending.splice(0, count);
	}

	protected abstract when(event: object): void;
}
