export abstract class AggregateRoot {
	private currentVersion = 0;
	private pending: object[] = [];

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

	loadFromHistory(events: readonly object[]): void {
		for (const event of events) {
			this.when(event);
			this.currentVersion++;
		}
	}

	commit(): void {
		this.pending = [];
	}

	protected abstract when(event: object): void;
}
