import Elysia from "elysia";
import { Logger } from "./utils/logger";
import { processParameters } from "./http-params";

export class AppStartup {
  private static readonly elysia: Elysia = new Elysia();
  private static readonly logger = new Logger(AppStartup.name);

  static create(module: any) {
    const controllers: Map<
      any,
      {
        httpMethod: string;
        pathname: string;
        methodName: string;
        guard?: any;
      }[]
    > = Reflect.getMetadata("dip:module:routes", module);

    for (const item of controllers.entries()) {
      const [controllerInstance, methods] = item;
      const controller = new controllerInstance();

      for (const method of methods) {
        AppStartup.logger.log(
          `Registering ${method.httpMethod} route: ${method.pathname}`
        );
        const httpMethod = method.httpMethod.toLowerCase();
        if (!(httpMethod in AppStartup.elysia)) {
          throw new Error(`HTTP method ${method.httpMethod} is not supported.`);
        }

        AppStartup.elysia[httpMethod as keyof Elysia](
          method.pathname,
          (req: any) =>
            AppStartup.executeControllerMethod(
              req,
              controller,
              method.methodName
            ),
          {
            beforeHandle(req: any) {
              if (!method.guard) return;
              const guardInstance = new method.guard();
              const isValid = guardInstance.validate(req);
              if (isValid instanceof Promise) {
                return isValid.then((valid) => {
                  if (!valid) {
                    throw new Error("Unauthorized");
                  }
                });
              } else {
                if (!isValid) {
                  throw new Error("Unauthorized");
                }
              }
            },
          }
        );
      }
    }

    return {
      listen: this.listen,
    };
  }

  static listen(port: number) {
    AppStartup.logger.log(`App is running at http://localhost:${port}`);
    AppStartup.elysia.listen(port);
  }

  private static async executeControllerMethod(
    req: any,
    controller: any,
    method: any
  ) {
    const args = processParameters(req, controller, method);
    return controller[method](...args);
  }
}
