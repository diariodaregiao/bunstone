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
  deps: Map<string, any>
): any[] {
  return paramTypes.map((paramType: any) => {
    if (!deps.has(paramType.name)) {
      deps.set(paramType.name, new paramType());
    }
    return deps.get(paramType.name);
  });
}
