import Elysia from "elysia";
import { processParameters } from "./http-params";
import { Logger } from "./utils/logger";

export class AppStartup {
  private static readonly elysia: Elysia = new Elysia();
  private static readonly logger = new Logger(AppStartup.name);

  static create(module: any) {
    const controllers: Map<any, { httpMethod: string; pathname: string; methodName: string }[]> = Reflect.getMetadata(
      "dip:module:routes",
      module,
    );

    for (const item of controllers.entries()) {
      const [controllerInstance, methods] = item;
      const controller = new controllerInstance();

      for (const method of methods) {
        AppStartup.logger.log(`Registering ${method.httpMethod} route: ${method.pathname}`);
        const httpMethod = method.httpMethod.toLowerCase();
        if (!(httpMethod in AppStartup.elysia)) {
          throw new Error(`HTTP method ${method.httpMethod} is not supported.`);
        }

        AppStartup.elysia[httpMethod as keyof Elysia](
          method.pathname,
          (req: any) => AppStartup.executeControllerMethod(req, controller, method.methodName),
          {
            beforeHandle(req: any) {
              console.log(`Incoming request: ${req.method} ${req.path}`);
            },
          },
        );
      }
    }

    const providersTimeouts: Map<any, { delay: number; methodName: string }[]> = Reflect.getMetadata(
      "dip:module:providers:timeouts",
      module,
    );

    for (const item of providersTimeouts.entries()) {
      const [providerInstance, timeouts] = item;
      const provider = new providerInstance();

      for (const timeout of timeouts) {
        AppStartup.logger.log(`Scheduling timeout for method: ${timeout.methodName} with delay: ${timeout.delay}ms`);
        setTimeout(() => {
          provider[timeout.methodName]();
        }, timeout.delay);
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

  private static async executeControllerMethod(req: any, controller: any, method: any) {
    const args = processParameters(req, controller, method);
    return controller[method](...args);
  }
}
