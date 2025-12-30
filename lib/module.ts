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

  const controllers = mapControllers(moduleConfig.controllers);

  return function (target) {
    Reflect.defineMetadata("dip:module", "is_module", target);
    Reflect.defineMetadata("dip:module:routes", controllers, target);
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

        controllersMap.get(controller)?.push({
          httpMethod: cm.httpMethod,
          pathname,
          methodName: cm.methodName,
          guard: controllerGuard,
        });
      });
    }
  }

  return controllersMap;
}
