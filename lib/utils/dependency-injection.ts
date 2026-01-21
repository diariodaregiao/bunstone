import "reflect-metadata";

/**
 * Utility functions for dependency injection.
 */

const globalDeps = new Map<any, any>();

export const GlobalRegistry = {
	register(type: any, instance: any) {
		globalDeps.set(type, instance);
	},

	get(type: any) {
		return globalDeps.get(type);
	},

	has(type: any) {
		return globalDeps.has(type);
	},

	getAll() {
		return globalDeps;
	},

	clear() {
		globalDeps.clear();
	},
};

const overrideDeps = new Map<any, any>();

export const OverrideRegistry = {
	register(type: any, instance: any) {
		overrideDeps.set(type, instance);
	},

	get(type: any) {
		return overrideDeps.get(type);
	},

	has(type: any) {
		return overrideDeps.has(type);
	},

	clear() {
		overrideDeps.clear();
	},
};

/**
 * Resolves dependencies for a constructor based on parameter types.
 * @param paramTypes Array of parameter types.
 * @param deps Map of available dependencies.
 * @returns Array of resolved dependencies.
 */
export function resolveDependencies(
	paramTypes: any[],
	deps: Map<any, any>,
): any[] {
	return paramTypes.map((paramType: any) => {
		return resolveType(paramType, deps);
	});
}

/**
 * Resolves a single type, creating an instance if it doesn't exist in the deps map.
 * @param type The class/type to resolve.
 * @param deps Map of available dependencies.
 * @returns The resolved instance.
 */
export function resolveType(type: any, deps: Map<any, any>): any {
	if (!type) {
		throw new Error(
			"Cannot resolve dependency: type is undefined. This often happens due to circular dependencies or using 'import type' for a class that needs to be injected.",
		);
	}

	if (type === Object) {
		throw new Error(
			"Cannot resolve dependency: type is 'Object'. This usually happens when 'emitDecoratorMetadata' is enabled but the class is imported as a type or there is a circular dependency.",
		);
	}

	if (OverrideRegistry.has(type)) {
		return OverrideRegistry.get(type);
	}

	if (deps.has(type)) {
		return deps.get(type);
	}

	if (GlobalRegistry.has(type)) {
		return GlobalRegistry.get(type);
	}

	// Also check by name for backward compatibility or if different references of the same class exist
	if (typeof type === "function" && type.name) {
		for (const [key, value] of deps.entries()) {
			if (typeof key === "function" && key.name === type.name) {
				return value;
			}
		}

		for (const [key, value] of GlobalRegistry.getAll().entries()) {
			if (typeof key === "function" && key.name === type.name) {
				return value;
			}
		}
	}

	const isInjectable = Reflect.getMetadata("injectable", type);
	if (!isInjectable) {
		// Optional: log warning if not marked as injectable
	}

	const paramTypes = Reflect.getMetadata("design:paramtypes", type) || [];
	const childrenDep = resolveDependencies(paramTypes, deps);

	const instance = new type(...childrenDep);
	deps.set(type, instance);
	return instance;
}
