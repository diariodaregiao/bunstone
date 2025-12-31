import type { ModuleConfig } from "../../../types/module-config";

export class MapProvidersWithCron {
  static execute(providers: ModuleConfig["providers"] = []) {
    return this.mapManyProviders(providers);
  }

  static mapManyProviders(
    providers: ModuleConfig["providers"] = [],
  ): Map<any, { expression: string; methodName: string }[]> {
    const providersCron = new Map<any, { expression: string; methodName: string }[]>();

    for (const provider of providers) {
      for (const providerSymbol of Object.getOwnPropertySymbols(provider.prototype)) {
        const methods = provider.prototype[providerSymbol];

        for (const method of methods) {
          if (method.type === "cron") {
            if (!providersCron.has(provider)) {
              providersCron.set(provider, []);
            }

            providersCron.get(provider)?.push({
              expression: method.expression,
              methodName: method.methodName,
            });
          }
        }
      }
    }

    return providersCron;
  }
}
