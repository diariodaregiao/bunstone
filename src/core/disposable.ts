export type Disposer = () => void | Promise<void>;

export class DisposableRegistry {
	private readonly disposers: Array<{ name: string; dispose: Disposer }> = [];

	add(dispose: Disposer, name = "disposable"): void {
		this.disposers.push({ name, dispose });
	}

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
