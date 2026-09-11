import "reflect-metadata";
import { ModuleInitializationError } from "@/errors";
import type { RateLimitConfig } from "@/ratelimit/decorator";
import {
	extractRateLimitModuleConfig,
	extractRateLimitModuleScope,
	type RateLimitModuleOptions,
	toRateLimitConfig,
} from "@/ratelimit/rate-limit-module";
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
	moduleRateLimits: Map<Constructor, RateLimitConfig>;
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
	// entries dedupe configurations; classes dedupe the static @Module metadata
	const seenEntries = new Set<ModuleImport>();
	const seenClasses = new Set<Constructor>();
	const scopes = new Map<Constructor, ModuleScope>();
	const moduleRateLimits = new Map<Constructor, RateLimitConfig>();

	const visit = (
		entry: ModuleImport,
		inheritedRateLimit?: RateLimitConfig,
	): void => {
		if (entry === undefined || entry === null) {
			throw new ModuleInitializationError(
				"An import, provider or controller entry is `undefined`.",
				"BNS-MOD-002",
				"This is almost always a circular import or an `import type` used as a value. Import the module as a value and break the cycle.",
				{},
			);
		}

		const moduleClass = isDynamicModule(entry) ? entry.module : entry;

		if (seenEntries.has(entry)) {
			if (inheritedRateLimit && !moduleRateLimits.has(moduleClass)) {
				moduleRateLimits.set(moduleClass, inheritedRateLimit);
			}
			return;
		}
		seenEntries.add(entry);
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

		// two `Module.register(...)` calls are two configurations of ONE module:
		// each contributes its own providers, but the class's static metadata
		// must only ever be applied once or its controllers register twice
		const firstVisit = !seenClasses.has(moduleClass);
		if (firstVisit) {
			seenClasses.add(moduleClass);
			modules.push(moduleClass);
		}
		const own = firstVisit ? staticMetadata : undefined;

		const imports = [...(own?.imports ?? []), ...(dynamic?.imports ?? [])];
		const providers = [
			...(own?.providers ?? []),
			...(dynamic?.providers ?? []),
		];
		const moduleControllers = [
			...(own?.controllers ?? []),
			...(dynamic?.controllers ?? []),
		];

		let ownRateLimitOptions: RateLimitModuleOptions | undefined;
		let ownRateLimitScope: "subtree" | "module" = "subtree";
		if (isDynamicModule(entry)) {
			ownRateLimitOptions = extractRateLimitModuleConfig(entry);
			if (ownRateLimitOptions) {
				ownRateLimitScope = extractRateLimitModuleScope(entry);
			}
		}
		if (!ownRateLimitOptions) {
			for (const imported of imports) {
				if (!isDynamicModule(imported)) continue;
				const config = extractRateLimitModuleConfig(imported);
				if (config) {
					ownRateLimitOptions = config;
					ownRateLimitScope = extractRateLimitModuleScope(imported);
					break;
				}
			}
		}
		const ownRateLimit = ownRateLimitOptions
			? toRateLimitConfig(ownRateLimitOptions)
			: undefined;
		const effectiveRateLimit = ownRateLimit ?? inheritedRateLimit;
		if (ownRateLimit && ownRateLimitScope === "module") {
			if (!moduleRateLimits.has(moduleClass)) {
				moduleRateLimits.set(moduleClass, ownRateLimit);
			}
		} else if (effectiveRateLimit && !moduleRateLimits.has(moduleClass)) {
			moduleRateLimits.set(moduleClass, effectiveRateLimit);
		}
		const propagate =
			ownRateLimit && ownRateLimitScope === "module"
				? inheritedRateLimit
				: effectiveRateLimit;

		const scope = scopeOf(scopes, moduleClass);
		if (own?.global || dynamic?.global) scope.global = true;
		if (own?.exports || dynamic?.exports) {
			scope.exports = [
				...(scope.exports ?? []),
				...(own?.exports ?? []),
				...(dynamic?.exports ?? []),
			];
		}

		for (const imported of imports) {
			scope.imports.add(isDynamicModule(imported) ? imported.module : imported);
			visit(imported, propagate);
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
	return { container, controllers, modules, moduleRateLimits };
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
	memo: Map<Constructor, Set<Token>>,
	inProgress = new Set<Constructor>(),
): Set<Token> {
	const cached = memo.get(moduleClass);
	if (cached) return cached;

	const scope = scopes.get(moduleClass);
	// `inProgress` breaks export cycles; `memo` is what keeps the surface of a
	// diamond import graph independent of the order modules are visited in
	if (!scope || inProgress.has(moduleClass)) return new Set();
	inProgress.add(moduleClass);

	if (!scope.exports) {
		const surface = scope.global ? new Set(scope.ownTokens) : new Set<Token>();
		inProgress.delete(moduleClass);
		memo.set(moduleClass, surface);
		return surface;
	}

	// an exported token may be re-exported from something this module imports
	const reExportable = new Set<Token>();
	for (const imported of scope.imports) {
		for (const token of publicTokens(scopes, imported, memo, inProgress)) {
			reExportable.add(token);
		}
	}

	const surface = new Set<Token>();
	for (const token of scope.exports) {
		if (scope.ownTokens.has(token) || reExportable.has(token)) {
			surface.add(token);
		}
	}
	inProgress.delete(moduleClass);
	memo.set(moduleClass, surface);
	return surface;
}

function buildVisibility(
	scopes: Map<Constructor, ModuleScope>,
): Map<Constructor, ReadonlySet<Token>> {
	const memo = new Map<Constructor, Set<Token>>();
	const globals = new Set<Token>();
	for (const [moduleClass, scope] of scopes) {
		if (!scope.global) continue;
		for (const token of publicTokens(scopes, moduleClass, memo)) {
			globals.add(token);
		}
	}

	const visibility = new Map<Constructor, ReadonlySet<Token>>();
	for (const [moduleClass, scope] of scopes) {
		const visible = new Set<Token>([...scope.ownTokens, ...globals]);
		for (const imported of scope.imports) {
			for (const token of publicTokens(scopes, imported, memo)) {
				visible.add(token);
			}
		}
		visibility.set(moduleClass, visible);
	}
	return visibility;
}
