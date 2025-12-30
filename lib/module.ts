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

  const controllers = new Map<
    any,
    { httpMethod: string; pathname: string; methodName: string }[]
  >();

  for (const controller of moduleConfig.controllers) {
    controllers.set(controller, []);

    for (const controllerSymbol of Object.getOwnPropertySymbols(controller)) {
      const controllerPathname = Reflect.getOwnMetadata(
        "dip:controller:pathname",
        controller
      );
      const controllerMethods: {
        httpMethod: string;
        pathname: string;
        methodName: string;
      }[] = controller[controllerSymbol];

      controllerMethods.forEach((cm) => {
        const pathname = `${
          controllerPathname === "/" ? "" : controllerPathname
        }${cm.pathname}`;

        controllers.get(controller)?.push({
          httpMethod: cm.httpMethod,
          pathname,
          methodName: cm.methodName,
        });
      });
    }
  }

  return function (target) {
    Reflect.defineMetadata("dip:module", "is_module", target);
    Reflect.defineMetadata("dip:module:routes", controllers, target);
  };
}
