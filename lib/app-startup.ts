import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import scheduler from "node-cron";
import { processParameters } from "./http-params";
import { Logger } from "./utils/logger";
import { cors, type CORSConfig } from "@elysiajs/cors";

export type Options = {
  cors?: CORSConfig;
};

export class AppStartup {
  private static readonly elysia: Elysia = new Elysia();
  private static readonly logger = new Logger(AppStartup.name);

  static create(module: any, options?: Options) {
    if (options?.cors) {
      AppStartup.elysia.use(cors(options.cors));
    }

    AppStartup.startWithJWT(module);
    AppStartup.registerRoutes(module);
    AppStartup.registerTimeouts(module);
    AppStartup.registerCronJobs(module);

    return {
      listen: this.listen,
    };
  }

  static listen(port: number) {
    AppStartup.logger.log(`App is running at http://localhost:${port}`);
    AppStartup.elysia.listen(port);
  }

  private static async executeControllerMethod(req: any, controller: any, method: any) {
    const args = await processParameters(req, controller, method);
    return controller[method](...args);
  }

  private static registerRoutes(module: any) {
    const controllers: Map<
      any,
      {
        httpMethod: string;
        pathname: string;
        methodName: string;
        guard?: any;
      }[]
    > = Reflect.getMetadata("dip:module:routes", module);

    const injectables: Map<string, any> = Reflect.getMetadata("dip:injectables", module);
    for (const item of controllers.entries()) {
      const [controllerInstance, methods] = item;
      const paramsTypes = Reflect.getMetadata("design:paramtypes", controllerInstance) || [];
      const dependencies = paramsTypes.map((paramType: any) => {
        return injectables.get(paramType.name);
      });
      let controller = new controllerInstance(...dependencies);
      controller = Object.assign(controller, AppStartup.getControllerHandler(module, controllerInstance));

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
          },
        );
      }
    }
  }

  private static registerTimeouts(module: any) {
    const providersTimeouts: Map<any, { delay: number; methodName: string }[]> = Reflect.getMetadata(
      "dip:timeouts",
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
  }

  private static registerCronJobs(module: any) {
    const providersCron: Map<any, { expression: string; methodName: string }[]> = Reflect.getMetadata(
      "dip:crons",
      module,
    );

    for (const item of providersCron.entries()) {
      const [providerInstance, crons] = item;
      const provider = new providerInstance();

      for (const cron of crons) {
        AppStartup.logger.log(`Scheduling timeout for method: ${cron.methodName}`);
        scheduler.schedule(cron.expression, () => {
          provider[cron.methodName]();
        });
      }
    }
  }

  private static startWithJWT(module: any) {
    const modules = Reflect.getMetadata("dip:modules", module) || [];
    for (const mod of modules) {
      const hasJWT = Reflect.getMetadata("dip:module:jwt", mod);
      if (hasJWT) {
        const jwtOptions = Reflect.getMetadata("dip:module:jwt:options", mod);
        AppStartup.elysia.use(jwt(jwtOptions));
      }
    }
  }

  private static getControllerHandler(module: any, controller: any) {
    const injectables: Map<string, any> = Reflect.getMetadata("dip:injectables", module);

    if (!injectables) {
      return [];
    }

    return injectables.get(controller?.name || controller.prototype?.name);
  }
}
