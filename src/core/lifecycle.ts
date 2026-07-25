export interface OnModuleInit {
	onModuleInit(): void | Promise<void>;
}

export interface OnApplicationBootstrap {
	onApplicationBootstrap(): void | Promise<void>;
}

export interface OnModuleDestroy {
	onModuleDestroy(): void | Promise<void>;
}

export type LifecycleHook =
	| "onModuleInit"
	| "onApplicationBootstrap"
	| "onModuleDestroy";

function hasHook(instance: unknown, hook: LifecycleHook): boolean {
	return typeof (instance as Record<string, unknown>)?.[hook] === "function";
}

/**
 * `isolate` keeps going when a hook throws and reports the failures together
 * at the end. Shutdown uses it so one provider that fails to close cannot
 * strand every provider queued behind it.
 */
export async function runLifecycle(
	instances: readonly unknown[],
	hook: LifecycleHook,
	reverse = false,
	isolate = false,
): Promise<void> {
	const ordered = reverse ? [...instances].reverse() : instances;
	const errors: Error[] = [];

	for (const instance of ordered) {
		if (!hasHook(instance, hook)) continue;
		const run = () =>
			(instance as Record<LifecycleHook, () => unknown>)[hook]();

		if (!isolate) {
			await run();
			continue;
		}
		try {
			await run();
		} catch (error) {
			errors.push(error instanceof Error ? error : new Error(String(error)));
		}
	}

	if (errors.length > 0) {
		throw new AggregateError(errors, `One or more ${hook} hooks failed.`);
	}
}
