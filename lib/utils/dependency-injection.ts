import "reflect-metadata";

/**
 * Utility functions for dependency injection.
 */

/**
 * Resolves dependencies for a constructor based on parameter types.
 * @param paramTypes Array of parameter types.
 * @param deps Map of available dependencies.
 * @returns Array of resolved dependencies.
 */
export function resolveDependencies(
  paramTypes: any[],
  deps: Map<any, any>
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
  if (deps.has(type)) {
    return deps.get(type);
  }

  // Also check by name for backward compatibility or if different references of the same class exist
  if (typeof type === "function" && type.name) {
    for (const [key, value] of deps.entries()) {
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
