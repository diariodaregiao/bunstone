import "reflect-metadata";
import { ModuleInitializationError } from "../errors";
import { Container, type Provider } from "./container";
import type { Constructor, Token } from "./injectable";

/**
 * Declares a module: a unit that groups controllers and providers and can
 * import other modules.
 *
 * Decorating a class only records metadata — nothing is instantiated here.
 * The dependency graph is built later, at application boot.
 */
export interface ModuleMetadata {
	/** Other modules whose providers this module builds upon. */
	imports?: Constructor[];
	/** HTTP controllers exposed by this module. */
	controllers?: Constructor[];
	/** Providers (services) available for injection. */
	providers?: Provider[];
	/** Tokens re-exported to modules that import this one (reserved for future scoping). */
	exports?: Token[];
	/** Reserved: marks the module's providers as application-global. */
	global?: boolean;
}

export const MODULE_METADATA = "bunstone:module";

/** Marks a class as a Bunstone module. */
export function Module(metadata: ModuleMetadata = {}): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(MODULE_METADATA, metadata, target);
	};
}

/** Reads the {@link ModuleMetadata} off a module class, if present. */
export function getModuleMetadata(
	module: Constructor,
): ModuleMetadata | undefined {
	return Reflect.getMetadata(MODULE_METADATA, module);
}

/** The result of compiling a module graph into a ready container. */
export interface CompiledModules {
	container: Container;
	controllers: Constructor[];
	modules: Constructor[];
}

/**
 * Walks the module graph starting at `root`, registering every provider and
 * controller into a single application container.
 *
 * v1 uses a flat injector: all providers are resolvable application-wide. This
 * is the simplest model that fixes the real bugs (global state, name-based
 * resolution) — scoped encapsulation can be layered on later without breaking
 * the public API.
 */
export function compileModules(root: Constructor): CompiledModules {
	const container = new Container();
	const modules: Constructor[] = [];
	const controllers: Constructor[] = [];
	const seen = new Set<Constructor>();

	const visit = (module: Constructor): void => {
		if (seen.has(module)) return;
		const metadata = getModuleMetadata(module);
		if (!metadata) {
			throw new ModuleInitializationError(
				`\`${module?.name ?? String(module)}\` is not a module.`,
				"BNS-MOD-001",
				"Decorate it with @Module({ ... }) and make sure it is imported as a value, not a type.",
				{ module: module?.name },
			);
		}

		seen.add(module);
		modules.push(module);

		for (const imported of metadata.imports ?? []) visit(imported);
		for (const provider of metadata.providers ?? [])
			container.register(provider);
		for (const controller of metadata.controllers ?? []) {
			controllers.push(controller);
			container.register(controller);
		}
	};

	visit(root);
	return { container, controllers, modules };
}
