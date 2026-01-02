import { cors } from "@elysiajs/cors";
import jwt from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import Elysia from "elysia";
import scheduler from "node-cron";
import "reflect-metadata";
import { HttpException } from "./http-exceptions";
import { CommandBus } from "./cqrs/command-bus";
import { QueryBus } from "./cqrs/query-bus";
import { EventBus } from "./cqrs/event-bus";
import { COMMAND_HANDLER_METADATA } from "./cqrs/decorators/command-handler.decorator";
import { QUERY_HANDLER_METADATA } from "./cqrs/decorators/query-handler.decorator";
import { EVENT_HANDLER_METADATA } from "./cqrs/decorators/event-handler.decorator";
import { SAGA_METADATA } from "./cqrs/decorators/saga.decorator";
import { processParameters } from "./http-params";
import {
  API_OPERATION_METADATA,
  API_RESPONSE_METADATA,
  API_TAGS_METADATA,
  API_HEADERS_METADATA,
} from "./openapi";
import { PARAM_METADATA_KEY } from "./constants";
import type { Options } from "./types/options";
import { resolveDependencies } from "./utils/dependency-injection";
import { Logger } from "./utils/logger";
import { isZodSchema } from "./utils/is-zod-schema";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Main entry point for the Bunstone application.
 * Handles module registration, route setup, and server startup.
 */
export class AppStartup {
  private static elysia: Elysia = new Elysia();
  private static readonly logger = new Logger(AppStartup.name);
  private static readonly registeredSagas = new WeakSet<any>();

  /**
   * Initializes the application from a root module.
   *
   * @param module The root module of the application.
   * @param options Optional configuration (e.g., CORS).
   * @returns An object with a `listen` method to start the server.
   */
  static create(module: any, options?: Options) {
    this.elysia = new Elysia(); // Reset for each creation

    this.elysia.error({
      HttpException,
    });

    this.elysia.onError(({ code, error, set }) => {
      if (error instanceof HttpException) {
        set.status = error.getStatus();
        return error.getResponse();
      }
      return error;
    });

    if (options?.cors) {
      AppStartup.elysia.use(cors(options.cors));
    }

    if (options?.swagger) {
      AppStartup.elysia.use(
        swagger({
          path: options.swagger.path || "/swagger",
          documentation: options.swagger.documentation,
        })
      );
    }

    AppStartup.registerModules(module);
    return {
      /**
       * Starts the server on the specified port.
       * @param port The port number to listen on.
       */
      listen: this.listen,
      /**
       * Returns the underlying Elysia instance.
       */
      getElysia: () => this.elysia,
    };
  }

  /**
   * Starts the server on the specified port.
   * @param port The port number to listen on.
   */
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
      const [ControllerClass, methods] = item;
      const paramsTypes =
        Reflect.getMetadata("design:paramtypes", ControllerClass) || [];
      const dependencies = resolveDependencies(paramsTypes, injectables);
      let controllerInstance = new ControllerClass(...dependencies);
      controllerInstance = Object.assign(
        controllerInstance,
        AppStartup.getControllerHandler(module, ControllerClass)
      );

      for (const method of methods) {
        AppStartup.logger.log(
          `Registering ${method.httpMethod} route: ${method.pathname}`
        );
        const httpMethod = method.httpMethod.toLowerCase();
        if (!(httpMethod in AppStartup.elysia)) {
          throw new Error(`HTTP method ${method.httpMethod} is not supported.`);
        }

        // OpenAPI Metadata
        const controllerTags =
          Reflect.getMetadata(API_TAGS_METADATA, ControllerClass) || [];
        const methodTags =
          Reflect.getMetadata(
            API_TAGS_METADATA,
            ControllerClass.prototype,
            method.methodName
          ) || [];
        const operation = Reflect.getMetadata(
          API_OPERATION_METADATA,
          ControllerClass.prototype,
          method.methodName
        );
        const responsesMetadata =
          Reflect.getMetadata(
            API_RESPONSE_METADATA,
            ControllerClass.prototype,
            method.methodName
          ) || [];

        const tags = [...new Set([...controllerTags, ...methodTags])];
        const responses: Record<string, any> = {};
        const elysiaResponses: Record<string, any> = {};

        responsesMetadata.forEach((res: any) => {
          const schema = isZodSchema(res.type)
            ? zodToJsonSchema(res.type)
            : res.type;

          responses[res.status.toString()] = {
            description: res.description,
            content: schema
              ? {
                  "application/json": {
                    schema: schema,
                  },
                }
              : undefined,
          };
          if (res.type) {
            elysiaResponses[res.status.toString()] = res.type;
          }
        });

        // OpenAPI Headers
        const controllerHeaders =
          Reflect.getMetadata(API_HEADERS_METADATA, ControllerClass) || [];
        const methodHeaders =
          Reflect.getMetadata(
            API_HEADERS_METADATA,
            ControllerClass.prototype,
            method.methodName
          ) || [];
        const allHeaders = [...controllerHeaders, ...methodHeaders];
        const parameters = allHeaders.map((h: any) => ({
          name: h.name,
          in: "header",
          description: h.description,
          required: h.required,
          schema: isZodSchema(h.schema)
            ? zodToJsonSchema(h.schema)
            : h.schema || { type: "string" },
        }));

        // Extract Schemas for OpenAPI
        const paramsMetadata =
          Reflect.getMetadata(
            PARAM_METADATA_KEY,
            ControllerClass.prototype,
            method.methodName
          ) || [];

        const bodySchema = paramsMetadata.find((p: any) => p.type === "body")
          ?.options?.zodSchema;
        const querySchema = paramsMetadata.find((p: any) => p.type === "query")
          ?.options?.zodSchema;
        const paramsSchema = paramsMetadata.find((p: any) => p.type === "param")
          ?.options?.zodSchema;

        if (bodySchema || querySchema || paramsSchema) {
          AppStartup.logger.info(
            `Schemas detected for ${method.httpMethod} ${method.pathname}: ${
              bodySchema ? "[Body] " : ""
            }${querySchema ? "[Query] " : ""}${paramsSchema ? "[Params]" : ""}`
          );
        }

        AppStartup.elysia[httpMethod as keyof Elysia](
          method.pathname,
          (req: any) =>
            AppStartup.executeControllerMethod(
              req,
              controllerInstance,
              method.methodName
            ),
          {
            body: bodySchema,
            query: querySchema,
            params: paramsSchema,
            response: elysiaResponses,
            detail: {
              tags,
              summary: operation?.summary,
              description: operation?.description,
              responses,
              parameters: [
                ...parameters,
                ...(querySchema && isZodSchema(querySchema)
                  ? Object.entries(
                      (zodToJsonSchema(querySchema) as any).properties || {}
                    ).map(([name, schema]: [string, any]) => ({
                      name,
                      in: "query",
                      required: (
                        (zodToJsonSchema(querySchema) as any).required || []
                      ).includes(name),
                      schema,
                    }))
                  : []),
                ...(paramsSchema && isZodSchema(paramsSchema)
                  ? Object.entries(
                      (zodToJsonSchema(paramsSchema) as any).properties || {}
                    ).map(([name, schema]: [string, any]) => ({
                      name,
                      in: "path",
                      required: true,
                      schema,
                    }))
                  : []),
              ],
              requestBody:
                bodySchema && isZodSchema(bodySchema)
                  ? {
                      content: {
                        "application/json": {
                          schema: zodToJsonSchema(bodySchema),
                        },
                      },
                    }
                  : undefined,
            },
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
        if (AppStartup.registeredSagas.has(sagaInstance)) {
          return;
        }
        AppStartup.registeredSagas.add(sagaInstance);

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

  private static getControllerHandler(module: any, controller: any) {
    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      module
    );

    if (!injectables) {
      return [];
    }

    return injectables.get(controller);
  }
}
