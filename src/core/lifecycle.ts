/**
 * Lifecycle hooks. Implement any of these on a provider and the application
 * will call them at the matching phase. All hooks may be async and are awaited.
 */

/** Called once the provider and its dependencies have been created. */
export interface OnModuleInit {
	onModuleInit(): void | Promise<void>;
}

/** Called after every module has initialised, before the server starts. */
export interface OnApplicationBootstrap {
	onApplicationBootstrap(): void | Promise<void>;
}

/** Called during graceful shutdown, before resources are released. */
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
 * Invokes `hook` on every instance that implements it, awaiting each in turn.
 * Pass `reverse` for teardown so resources close in the opposite order they opened.
 */
export async function runLifecycle(
	instances: readonly unknown[],
	hook: LifecycleHook,
	reverse = false,
): Promise<void> {
	const ordered = reverse ? [...instances].reverse() : instances;
	for (const instance of ordered) {
		if (hasHook(instance, hook)) {
			await (instance as Record<LifecycleHook, () => unknown>)[hook]();
		}
	}
}
