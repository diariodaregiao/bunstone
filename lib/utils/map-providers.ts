/**
 * Utility to map providers with specific decorator types.
 */

/**
 * Maps providers to their decorated methods based on type.
 * @param providers Array of provider classes.
 * @param type The type of decorator (e.g., 'cron', 'timeout').
 * @returns A map of providers to their methods.
 */
export function mapProvidersWithType(
  providers: (new (...args: any[]) => any)[] = [],
  type: string,
): Map<any, { expression?: string; delay?: number; methodName: string }[]> {
  const result = new Map<
    any,
    { expression?: string; delay?: number; methodName: string }[]
  >();

  for (const provider of providers) {
    for (const providerSymbol of Object.getOwnPropertySymbols(
      provider.prototype,
    )) {
      const methods = provider.prototype[providerSymbol];

      for (const method of methods) {
        if (method.type === type) {
          if (!result.has(provider)) {
            result.set(provider, []);
          }

          result.get(provider)?.push({
            expression: method.expression,
            delay: method.delay,
            methodName: method.methodName,
          });
        }
      }
    }
  }

  return result;
}
