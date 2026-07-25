import "reflect-metadata";
import { ModuleInitializationError } from "@/errors";
import { Container, type Provider } from "./container";
import type { Constructor, Token } from "./injectable";

export interface ModuleMetadata {
	imports?: ModuleImport[];
	controllers?: Constructor[];
	providers?: Provider[];
	exports?: Token[];
	global?: boolean;
}

export interface DynamicModule {
	module: Constructor;
	imports?: ModuleImport[];
	controllers?: Constructor[];
	providers?: Provider[];
	exports?: Token[];
	global?: boolean;
}

export type ModuleImport = Constructor | DynamicModule;

export const MODULE_METADATA = "bunstone:module";

export function Module(metadata: ModuleMetadata = {}): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(MODULE_METADATA, metadata, target);
	};
}

export function getModuleMetadata(
	module: Constructor,
): ModuleMetadata | undefined {
	return Reflect.getMetadata(MODULE_METADATA, module);
}

function isDynamicModule(entry: ModuleImport): entry is DynamicModule {
	return typeof entry === "object" && entry !== null && "module" in entry;
}

export interface CompiledModules {
	container: Container;
	controllers: Constructor[];
	modules: Constructor[];
}

export function compileModules(root: ModuleImport): CompiledModules {
	const container = new Container();
	const modules: Constructor[] = [];
	const controllers: Constructor[] = [];
	const seen = new Set<ModuleImport | Constructor>();

	const visit = (entry: ModuleImport): void => {
		if (entry === undefined || entry === null) {
			throw new ModuleInitializationError(
				"An import, provider or controller entry is `undefined`.",
				"BNS-MOD-002",
				"This is almost always a circular import or an `import type` used as a value. Import the module as a value and break the cycle.",
				{},
			);
		}

		const moduleClass = isDynamicModule(entry) ? entry.module : entry;
		// dedupe by the entry itself: two `Module.register(...)` calls are two
		// distinct configurations and both must contribute their providers
		if (seen.has(entry)) return;
		if (!isDynamicModule(entry) && seen.has(moduleClass)) return;

		const staticMetadata = getModuleMetadata(moduleClass);
		const dynamic = isDynamicModule(entry) ? entry : undefined;
		if (!staticMetadata && !dynamic) {
			throw new ModuleInitializationError(
				`\`${moduleClass?.name ?? String(moduleClass)}\` is not a module.`,
				"BNS-MOD-001",
				"Decorate it with @Module({ ... }) and make sure it is imported as a value, not a type.",
				{ module: moduleClass?.name },
			);
		}

		seen.add(entry);
		seen.add(moduleClass);
		if (!modules.includes(moduleClass)) modules.push(moduleClass);

		const imports = [
			...(staticMetadata?.imports ?? []),
			...(dynamic?.imports ?? []),
		];
		const providers = [
			...(staticMetadata?.providers ?? []),
			...(dynamic?.providers ?? []),
		];
		const moduleControllers = [
			...(staticMetadata?.controllers ?? []),
			...(dynamic?.controllers ?? []),
		];

		for (const imported of imports) visit(imported);
		for (const provider of providers) container.register(provider);
		for (const controller of moduleControllers) {
			controllers.push(controller);
			container.register(controller);
		}
	};

	visit(root);
	return { container, controllers, modules };
}
