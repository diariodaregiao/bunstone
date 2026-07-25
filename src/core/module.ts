import "reflect-metadata";
import { ModuleInitializationError } from "@/errors";
import { Container, type Provider, providerToken } from "./container";
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

/** What one module contributes to, and may see in, the dependency graph. */
interface ModuleScope {
	ownTokens: Set<Token>;
	exports: Token[] | undefined;
	imports: Set<Constructor>;
	global: boolean;
}

export function compileModules(
	root: ModuleImport,
	strict = false,
): CompiledModules {
	const container = new Container();
	const modules: Constructor[] = [];
	const controllers: Constructor[] = [];
	const seen = new Set<ModuleImport | Constructor>();
	const scopes = new Map<Constructor, ModuleScope>();

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

		const scope = scopeOf(scopes, moduleClass);
		if (staticMetadata?.global || dynamic?.global) scope.global = true;
		const declaredExports = [
			...(staticMetadata?.exports ?? []),
			...(dynamic?.exports ?? []),
		];
		if (staticMetadata?.exports || dynamic?.exports) {
			scope.exports = [...(scope.exports ?? []), ...declaredExports];
		}

		for (const imported of imports) {
			scope.imports.add(isDynamicModule(imported) ? imported.module : imported);
			visit(imported);
		}
		for (const provider of providers) {
			container.register(provider, moduleClass);
			scope.ownTokens.add(providerToken(provider));
		}
		for (const controller of moduleControllers) {
			controllers.push(controller);
			container.register(controller, moduleClass);
			scope.ownTokens.add(controller);
		}
	};

	visit(root);

	if (strict) {
		container.enforceBoundaries(buildVisibility(scopes));
	}
	return { container, controllers, modules };
}

function scopeOf(
	scopes: Map<Constructor, ModuleScope>,
	moduleClass: Constructor,
): ModuleScope {
	const existing = scopes.get(moduleClass);
	if (existing) return existing;
	const created: ModuleScope = {
		ownTokens: new Set(),
		exports: undefined,
		imports: new Set(),
		global: false,
	};
	scopes.set(moduleClass, created);
	return created;
}

/**
 * A module's public surface. An explicit `exports` list is the surface; a
 * global module that declares none exposes everything it provides, since
 * "global with nothing visible" is never what the author meant.
 */
function publicTokens(
	scopes: Map<Constructor, ModuleScope>,
	moduleClass: Constructor,
	seen = new Set<Constructor>(),
): Set<Token> {
	const scope = scopes.get(moduleClass);
	if (!scope || seen.has(moduleClass)) return new Set();
	seen.add(moduleClass);

	if (!scope.exports) {
		return scope.global ? new Set(scope.ownTokens) : new Set();
	}

	// an exported token may be re-exported from something this module imports
	const reExportable = new Set<Token>();
	for (const imported of scope.imports) {
		for (const token of publicTokens(scopes, imported, seen)) {
			reExportable.add(token);
		}
	}

	const surface = new Set<Token>();
	for (const token of scope.exports) {
		if (scope.ownTokens.has(token) || reExportable.has(token)) {
			surface.add(token);
		}
	}
	return surface;
}

function buildVisibility(
	scopes: Map<Constructor, ModuleScope>,
): Map<Constructor, ReadonlySet<Token>> {
	const globals = new Set<Token>();
	for (const [moduleClass, scope] of scopes) {
		if (!scope.global) continue;
		for (const token of publicTokens(scopes, moduleClass)) globals.add(token);
	}

	const visibility = new Map<Constructor, ReadonlySet<Token>>();
	for (const [moduleClass, scope] of scopes) {
		const visible = new Set<Token>([...scope.ownTokens, ...globals]);
		for (const imported of scope.imports) {
			for (const token of publicTokens(scopes, imported)) visible.add(token);
		}
		visibility.set(moduleClass, visible);
	}
	return visibility;
}
