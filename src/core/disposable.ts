/** A cleanup function registered for graceful shutdown. */
export type Disposer = () => void | Promise<void>;

/**
 * Tracks every resource the application opens (server, cron jobs, queue workers,
 * message consumers, SQL pool, telemetry) so `close()` can release them all in
 * reverse order. This is how v1 avoids the leaked crons/workers/consumers of v0.7.
 */
export class DisposableRegistry {
	private readonly disposers: Array<{ name: string; dispose: Disposer }> = [];

	/** Registers a disposer. `name` is used only for error reporting. */
	add(dispose: Disposer, name = "disposable"): void {
		this.disposers.push({ name, dispose });
	}

	/**
	 * Runs every disposer in reverse registration order. All disposers run even
	 * if some throw; a combined `AggregateError` is thrown at the end if any did.
	 */
	async disposeAll(): Promise<void> {
		const errors: Error[] = [];
		for (const { name, dispose } of [...this.disposers].reverse()) {
			try {
				await dispose();
			} catch (error) {
				errors.push(
					error instanceof Error
						? error
						: new Error(`Disposer "${name}" failed: ${String(error)}`),
				);
			}
		}
		this.disposers.length = 0;
		if (errors.length > 0) {
			throw new AggregateError(
				errors,
				"One or more disposers failed during shutdown.",
			);
		}
	}
}
