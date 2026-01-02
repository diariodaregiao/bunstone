import { cors, type CORSConfig } from "@elysiajs/cors";
import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import scheduler from "node-cron";
import { processParameters } from "./http-params";
import { Logger } from "./utils/logger";
import { resolveDependencies } from "./utils/dependency-injection";
import "reflect-metadata";
import { CommandBus } from "./cqrs/command-bus";
import { QueryBus } from "./cqrs/query-bus";
import { EventBus } from "./cqrs/event-bus";
import { COMMAND_HANDLER_METADATA } from "./cqrs/decorators/command-handler.decorator";
import { QUERY_HANDLER_METADATA } from "./cqrs/decorators/query-handler.decorator";
import { EVENT_HANDLER_METADATA } from "./cqrs/decorators/event-handler.decorator";
import { SAGA_METADATA } from "./cqrs/decorators/saga.decorator";

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

    AppStartup.registerModules(module);
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
    const args = await processParameters(req, controller, method);
    return controller[method](...args);
  }

  private static registerModules(module: any) {
    AppStartup.startWithJWT(module);
    AppStartup.registerRoutes(module);
    AppStartup.registerTimeouts(module);
    AppStartup.registerCronJobs(module);
    AppStartup.registerCqrsHandlers(module);

    const modules = Reflect.getMetadata("dip:modules", module) || [];

    for (const mod of modules) {
      AppStartup.registerModules(mod);
    }
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

    if (!controllers) {
      return;
    }

    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      module
    );
    for (const item of controllers.entries()) {
      const [controllerInstance, methods] = item;
      const paramsTypes =
        Reflect.getMetadata("design:paramtypes", controllerInstance) || [];
      const dependencies = resolveDependencies(paramsTypes, injectables);
      let controller = new controllerInstance(...dependencies);

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
  }

  private static registerTimeouts(module: any) {
    const providersTimeouts: Map<any, { delay: number; methodName: string }[]> =
      Reflect.getMetadata("dip:timeouts", module);

    if (!providersTimeouts) {
      return;
    }

    for (const item of providersTimeouts.entries()) {
      const [providerInstance, timeouts] = item;
      const provider = new providerInstance();

      for (const timeout of timeouts) {
        AppStartup.logger.log(
          `Scheduling timeout for method: ${timeout.methodName} with delay: ${timeout.delay}ms`
        );
        setTimeout(() => {
          provider[timeout.methodName]();
        }, timeout.delay);
      }
    }
  }

  private static registerCronJobs(module: any) {
    const providersCron: Map<
      any,
      { expression: string; methodName: string }[]
    > = Reflect.getMetadata("dip:crons", module);

    if (!providersCron) {
      return;
    }

    for (const item of providersCron.entries()) {
      const [providerInstance, crons] = item;
      const provider = new providerInstance();

      for (const cron of crons) {
        AppStartup.logger.log(`Scheduling cron for method: ${cron.methodName}`);
        scheduler.schedule(cron.expression, () => {
          provider[cron.methodName]();
        });
      }
    }
  }

  private static registerCqrsHandlers(module: any) {
    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      module
    );

    if (!injectables) return;

    const commandBus = injectables.get(CommandBus);
    const queryBus = injectables.get(QueryBus);
    const eventBus = injectables.get(EventBus);

    const commandHandlers: any[] = [];
    const queryHandlers: any[] = [];
    const eventHandlers: any[] = [];
    const sagas: any[] = [];

    for (const instance of injectables.values()) {
      if (Reflect.hasMetadata(COMMAND_HANDLER_METADATA, instance.constructor)) {
        commandHandlers.push(instance);
      }
      if (Reflect.hasMetadata(QUERY_HANDLER_METADATA, instance.constructor)) {
        queryHandlers.push(instance);
      }
      if (Reflect.hasMetadata(EVENT_HANDLER_METADATA, instance.constructor)) {
        eventHandlers.push(instance);
      }
      if (Reflect.hasMetadata(SAGA_METADATA, instance.constructor)) {
        sagas.push(instance);
      }
    }

    if (commandBus && commandHandlers.length > 0) {
      commandBus.register(commandHandlers);
    }
    if (queryBus && queryHandlers.length > 0) {
      queryBus.register(queryHandlers);
    }
    if (eventBus && eventHandlers.length > 0) {
      eventBus.register(eventHandlers);
    }

    if (eventBus && commandBus && sagas.length > 0) {
      sagas.forEach((sagaInstance) => {
        const sagaMethods: string[] = Reflect.getMetadata(
          SAGA_METADATA,
          sagaInstance.constructor
        );
        sagaMethods.forEach((methodName) => {
          const sagaFn = sagaInstance[methodName];
          if (typeof sagaFn === "function") {
            // In NestJS, sagas return an observable of commands.
            // We simulate this by subscribing to the event stream and executing returned commands.
            const stream = sagaFn.call(sagaInstance, eventBus.stream);
            if (stream && typeof stream.subscribe === "function") {
              stream.subscribe((command: any) => {
                if (command) {
                  commandBus.execute(command).catch((err: any) => {
                    AppStartup.logger.error(
                      `Error executing command from Saga ${sagaInstance.constructor.name}.${methodName}:`,
                      err
                    );
                  });
                }
              });
            }
          }
        });
      });
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
}
