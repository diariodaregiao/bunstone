import type { GuardContract } from "./guard";
import { MapProvidersWithCron } from "./schedule/cron/mappers/map-providers-with-cron";
import { MapProvidersWithTimeout } from "./schedule/timeout/mappers/map-providers-with-timeouts";
import type { ModuleConfig } from "./types/module-config";
import { resolveDependencies } from "./utils/dependency-injection";
import "reflect-metadata";

/**
 * Decorator to define a module with controllers, providers, imports, and exports.
 * @param moduleConfig Configuration for the module.
 * @returns A class decorator.
 */
export function Module(moduleConfig: ModuleConfig = {}): ClassDecorator {
  moduleConfig.controllers = moduleConfig.controllers || [];
  moduleConfig.providers = moduleConfig.providers || [];
  moduleConfig.imports = moduleConfig.imports || [];
  moduleConfig.exports = moduleConfig.exports || [];

  const modules = moduleConfig.imports;
  const controllers = mapControllers(moduleConfig.controllers);
  const providersTimeouts = MapProvidersWithTimeout.execute(
    moduleConfig.providers
  );
  const providersCrons = MapProvidersWithCron.execute(moduleConfig.providers);
  const injectableProviders = mapInjectableProviders(moduleConfig.providers);

  return function (target) {
    Reflect.defineMetadata("dip:module", "is_module", target);
    Reflect.defineMetadata("dip:module:routes", controllers, target);
    Reflect.defineMetadata("dip:timeouts", providersTimeouts, target);
    Reflect.defineMetadata("dip:modules", modules, target);
    Reflect.defineMetadata("dip:crons", providersCrons, target);
    Reflect.defineMetadata("dip:injectables", injectableProviders, target);
  };
}

/**
 * Maps controllers to their routes and guards.
 * @param controllers Array of controller classes.
 * @returns A map of controllers to their methods.
 */
function mapControllers(controllers: ModuleConfig["controllers"] = []) {
  const controllersMap = new Map<
    any,
    {
      httpMethod: string;
      pathname: string;
      methodName: string;
      guard?: GuardContract;
    }[]
  >();

  for (const controller of controllers) {
    controllersMap.set(controller, []);

    for (const controllerSymbol of Object.getOwnPropertySymbols(controller)) {
      const controllerPathname = Reflect.getOwnMetadata(
        "dip:controller:pathname",
        controller
      );

      const controllerGuard = Reflect.getMetadata("dip:guard", controller);

      const controllerMethods: {
        httpMethod: string;
        pathname: string;
        methodName: string;
      }[] = (controller as any)[controllerSymbol];

      controllerMethods.forEach((cm) => {
        const pathname = `${
          controllerPathname === "/" ? "" : controllerPathname
        }${cm.pathname}`;

        const methodGuard = Reflect.getMetadata(
          "dip:guard",
          controller.prototype,
          cm.methodName
        );

        controllersMap.get(controller)?.push({
          httpMethod: cm.httpMethod,
          pathname,
          methodName: cm.methodName,
          guard: methodGuard || controllerGuard,
        });
      });
    }
  }

  return controllersMap;
}

/**
 * Maps injectable providers and their dependencies.
 * @param providers Array of provider classes.
 * @returns A map of provider names to instances.
 */
function mapInjectableProviders(providers: ModuleConfig["providers"] = []) {
  const deps: Map<string, any> = new Map();

  providers.map((provider) => {
    const isInjectable = Reflect.getMetadata("injectable", provider);
    if (!isInjectable) return;

    const paramTypes = Reflect.getMetadata("design:paramtypes", provider) || [];

    const childrenDep = resolveDependencies(paramTypes, deps);

    if (!deps.has(provider.name)) {
      deps.set(provider.name, new provider(...childrenDep));
    }
  });

  return deps;
}
