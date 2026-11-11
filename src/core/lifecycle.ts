import type { Container } from "./container";
import type { DisposableRegistry } from "./disposable";

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
 * Internal hooks that let a feature module plug itself into bootstrap. The
 * core calls them instead of importing the feature, so an application only
 * bundles the features it actually registers: an app without RabbitMQ never
 * pulls in amqplib, one without an event store never pulls in its drivers.
 */

/** What a wiring hook receives. */
export interface WiringContext {
	readonly container: Container;
	readonly instances: readonly unknown[];
	/**
	 * `false` inside `Test.createTestingModule()`: nothing may reach outside
	 * the process (no broker connection, no timers).
	 */
	readonly live: boolean;
	/** Stopped before the destroy hooks: what takes in work. */
	readonly intake: DisposableRegistry;
	/** Released after the destroy hooks: what a hook may still use. */
	readonly resources: DisposableRegistry;
	readonly shutdownTimeoutMs: number;
}

/**
 * A provider's method that wires its feature in, after `onModuleInit` and
 * before `onApplicationBootstrap`.
 */
export const FRAMEWORK_WIRING = Symbol.for("bunstone:framework-wiring");

/**
 * Optional order of a wiring hook, lowest first (default 100). It keeps the
 * bootstrap order the features always had: RabbitMQ (10), then MCP (20).
 */
export const FRAMEWORK_WIRING_ORDER = Symbol.for(
	"bunstone:framework-wiring-order",
);

export interface FrameworkWiring {
	[FRAMEWORK_WIRING](context: WiringContext): void | Promise<void>;
	[FRAMEWORK_WIRING_ORDER]?: number;
}

export async function runFrameworkWiring(
	context: WiringContext,
): Promise<void> {
	const hooks = context.instances
		.filter(
			(instance): instance is FrameworkWiring =>
				typeof (instance as Partial<FrameworkWiring> | null)?.[
					FRAMEWORK_WIRING
				] === "function",
		)
		.map((instance, index) => ({ instance, index }))
		// stable: equal orders keep the order the providers were created in
		.sort(
			(a, b) =>
				(a.instance[FRAMEWORK_WIRING_ORDER] ?? 100) -
					(b.instance[FRAMEWORK_WIRING_ORDER] ?? 100) || a.index - b.index,
		);
	for (const { instance } of hooks) {
		await instance[FRAMEWORK_WIRING](context);
	}
}

/**
 * A check a module registers as a `useValue` provider, run on the compiled
 * graph *before* any provider is created, so a misconfiguration is reported
 * in terms of the module the user forgot rather than a raw missing token.
 */
export const FRAMEWORK_PREFLIGHT = Symbol.for("bunstone:framework-preflight");

export interface FrameworkPreflight {
	[FRAMEWORK_PREFLIGHT](container: Container): void;
}
