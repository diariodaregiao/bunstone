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

  const controllers = new Map<any, { httpMethod: string; pathname: string; methodName: string }[]>();

  for (const controller of moduleConfig.controllers) {
    controllers.set(controller, []);

    for (const controllerSymbol of Object.getOwnPropertySymbols(controller)) {
      const controllerPathname = Reflect.getOwnMetadata("dip:controller:pathname", controller);
      const controllerMethods: {
        httpMethod: string;
        pathname: string;
        methodName: string;
      }[] = controller[controllerSymbol];

      controllerMethods.forEach((cm) => {
        const pathname = `${controllerPathname === "/" ? "" : controllerPathname}${cm.pathname}`;

        controllers.get(controller)?.push({
          httpMethod: cm.httpMethod,
          pathname,
          methodName: cm.methodName,
        });
      });
    }
  }

  const providersTimeouts = new Map<any, { delay: number; methodName: string }[]>();

  for (const provider of moduleConfig.providers) {
    for (const providerSymbol of Object.getOwnPropertySymbols(provider.prototype)) {
      const providerType: string = provider.prototype[providerSymbol].type;

      if (providerType === "timeout") {
        if (!providersTimeouts.has(provider)) {
          providersTimeouts.set(provider, []);
        }

        providersTimeouts.get(provider)?.push({
          delay: provider.prototype[providerSymbol].delay,
          methodName: provider.prototype[providerSymbol].methodName,
        });
      }
    }
  }

  return function (target) {
    Reflect.defineMetadata("dip:module", "is_module", target);
    Reflect.defineMetadata("dip:module:routes", controllers, target);
    Reflect.defineMetadata("dip:module:providers:timeouts", providersTimeouts, target);
  };
}
