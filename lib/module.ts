import type { GuardContract } from "./guard";

type ModuleConfig = {
  providers?: any[];
  imports?: any[];
  controllers?: any[];
  exports?: any[];
};

export function Module(moduleConfig: ModuleConfig = {}): ClassDecorator {
  moduleConfig.controllers = moduleConfig.controllers || [];
  moduleConfig.providers = moduleConfig.providers || [];
  moduleConfig.imports = moduleConfig.imports || [];
  moduleConfig.exports = moduleConfig.exports || [];

  const modules = moduleConfig.imports;
  const controllers = mapControllers(moduleConfig.controllers);
  const providersTimeouts = mapProvidersWithTimeouts(moduleConfig.providers);

  return function (target) {
    Reflect.defineMetadata("dip:module", "is_module", target);
    Reflect.defineMetadata("dip:module:routes", controllers, target);
    Reflect.defineMetadata("dip:timeouts", providersTimeouts, target);
    Reflect.defineMetadata("dip:modules", modules, target);
  };
}

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
      }[] = controller[controllerSymbol];

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

function mapProvidersWithTimeouts(providers: ModuleConfig["providers"] = []) {
  const providersTimeouts = new Map<
    any,
    { delay: number; methodName: string }[]
  >();

  for (const provider of providers) {
    for (const providerSymbol of Object.getOwnPropertySymbols(
      provider.prototype
    )) {
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
