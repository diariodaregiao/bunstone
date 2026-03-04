import "reflect-metadata";
import { DependencyResolutionError } from "../errors";

/**
 * Utility functions for dependency injection.
 */

const globalDeps = new Map<any, any>();
const resolutionStack: string[] = [];

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
	const typeName = type?.name || "unknown";

	if (!type) {
		const stack = [...resolutionStack].join(" -> ");
		throw DependencyResolutionError.undefinedType(stack);
	}

	if (type === Object) {
		const stack = [...resolutionStack, "Object"].join(" -> ");
		throw DependencyResolutionError.objectType(stack);
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

	resolutionStack.push(typeName);

	try {
		const paramTypes = Reflect.getMetadata("design:paramtypes", type) || [];
		const childrenDep = resolveDependencies(paramTypes, deps);

		const instance = new type(...childrenDep);
		deps.set(type, instance);
		return instance;
	} finally {
		resolutionStack.pop();
	}
}
