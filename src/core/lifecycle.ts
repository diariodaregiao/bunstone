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
