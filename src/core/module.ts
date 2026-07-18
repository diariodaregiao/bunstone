import "reflect-metadata";
import { ModuleInitializationError } from "@/errors";
import { Container, type Provider } from "./container";
import type { Constructor, Token } from "./injectable";

export interface ModuleMetadata {
	imports?: Constructor[];

	controllers?: Constructor[];

	providers?: Provider[];

	exports?: Token[];

	global?: boolean;
}

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

export interface CompiledModules {
	container: Container;
	controllers: Constructor[];
	modules: Constructor[];
}

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
