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
	"onModuleInit" | "onApplicationBootstrap" | "onModuleDestroy";

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

/**
 * Internal: a provider a feature module registers to wire itself in during
 * bootstrap, after `onModuleInit`. The core calls it instead of importing the
 * feature, so an application only bundles the features it registers.
 */
export const FRAMEWORK_WIRING = Symbol.for("bunstone:framework-wiring");

export interface FrameworkWiring {
	[FRAMEWORK_WIRING](
		container: import("./container").Container,
		instances: readonly unknown[],
	): void | Promise<void>;
}

export async function runFrameworkWiring(
	container: import("./container").Container,
	instances: readonly unknown[],
): Promise<void> {
	for (const instance of instances) {
		const wire = (instance as Partial<FrameworkWiring> | null)?.[
			FRAMEWORK_WIRING
		];
		if (typeof wire === "function") {
			await wire.call(instance, container, instances);
		}
	}
}
