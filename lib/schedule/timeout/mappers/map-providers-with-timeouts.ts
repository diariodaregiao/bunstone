import type { ModuleConfig } from "../../../types/module-config";

export class MapProvidersWithTimeout {
  static execute(providers: ModuleConfig["providers"] = []) {
    return this.mapManyProviders(providers);
  }

  private static mapManyProviders(
    providers: ModuleConfig["providers"] = [],
  ): Map<any, { delay: number; methodName: string }[]> {
    const providersTimeouts = new Map<any, { delay: number; methodName: string }[]>();

    for (const provider of providers) {
      for (const providerSymbol of Object.getOwnPropertySymbols(provider.prototype)) {
        const methods = provider.prototype[providerSymbol];

        for (const method of methods) {
          if (method.type === "timeout") {
            if (!providersTimeouts.has(provider)) {
              providersTimeouts.set(provider, []);
            }
          }

          providersTimeouts.get(provider)?.push({
            delay: method.delay,
            methodName: method.methodName,
          });
        }
      }
    }

    return providersTimeouts;
  }
}
