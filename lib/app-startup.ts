import { cors } from "@elysiajs/cors";
console.log("APP STARTUP LOADED FROM:", import.meta.url);
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import jwt from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import Elysia from "elysia";
import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { Layout } from "./components/layout";
import scheduler from "node-cron";
import "reflect-metadata";
import {
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { HttpException } from "./http-exceptions";
import { CommandBus } from "./cqrs/command-bus";
import { QueryBus } from "./cqrs/query-bus";
import { EventBus } from "./cqrs/event-bus";
import { COMMAND_HANDLER_METADATA } from "./cqrs/decorators/command-handler.decorator";
import { QUERY_HANDLER_METADATA } from "./cqrs/decorators/query-handler.decorator";
import { EVENT_HANDLER_METADATA } from "./cqrs/decorators/event-handler.decorator";
import { SAGA_METADATA } from "./cqrs/decorators/saga.decorator";
import { processParameters } from "./http-params";
import { RENDER_METADATA } from "./render";
import {
  API_OPERATION_METADATA,
  API_RESPONSE_METADATA,
  API_TAGS_METADATA,
  API_HEADERS_METADATA,
} from "./openapi";
import { PARAM_METADATA_KEY } from "./constants";
import type { Options } from "./types/options";
import {
  resolveDependencies,
  GlobalRegistry,
} from "./utils/dependency-injection";
import { Logger } from "./utils/logger";
import { ParamType } from "./http-params";

/**
 * Main entry point for the Bunstone application.
 * Handles module registration, route setup, and server startup.
 */
export class AppStartup {
  private static elysia: Elysia = new Elysia();
  private static readonly logger = new Logger(AppStartup.name);
  private static readonly registeredSagas = new WeakSet<any>();
  private static readonly viewBundles = new Map<string, string>();

  /**
   * Initializes the application from a root module.
   *
   * @param module The root module of the application.
   * @param options Optional configuration (e.g., CORS).
   * @returns An object with a `listen` method to start the server.
   */
  static create(module: any, options?: Options) {
    this.elysia = new Elysia(); // Reset for each creation

    // Ensure public directory exists before static plugin uses it
    if (!existsSync("./public")) mkdirSync("./public", { recursive: true });

    this.elysia.use(html());
    this.elysia.use(
      staticPlugin({
        assets: "public",
        prefix: "/public",
      })
    );

    if (options?.viewsDir) {
      this.autoBundle(options.viewsDir).catch((err) => {
        this.logger.error(`Failed to auto-bundle views: ${err.message}`);
      });
    }

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
   * Bundles a client-side component for hydration (internal).
   */
  private static async bundle(entryPath: string, outputName: string) {
    try {
      const result = await Bun.build({
        entrypoints: [entryPath],
        outdir: "./public",
        naming: outputName,
        minify: true,
        external: [
          "react",
          "react-dom",
          "react-dom/client",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
        ],
      });

      if (!result.success) {
        this.logger.error(
          `Bundle failed for ${outputName}: ${result.logs
            .map((l) => l.message)
            .join("\n")}`
        );
      } else {
        this.logger.log(`Bundle created successfully: public/${outputName}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error during bundling ${outputName}: ${error.message}`
      );
    }
  }

  private static async autoBundle(viewsDir: string) {
    if (!existsSync(viewsDir)) return;

    if (!existsSync("./.bunstone"))
      mkdirSync("./.bunstone", { recursive: true });

    const getFilesRecursively = (dir: string): string[] => {
      let results: string[] = [];
      const list = readdirSync(dir);
      for (const file of list) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath));
        } else {
          results.push(resolve(fullPath));
        }
      }
      return results;
    };

    const viewsDirAbs = resolve(viewsDir);
    const files = getFilesRecursively(viewsDirAbs);
    this.logger.log(
      `Auto-bundling views from ${viewsDirAbs} (${files.length} views found)`
    );

    for (const absolutePath of files) {
      const file = basename(absolutePath);
      if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
        const componentName = basename(file, extname(file));
        const entryPath = join(
          process.cwd(),
          ".bunstone",
          `${componentName}.client.tsx`
        );

        const entryContent = `
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Mod from '${absolutePath}';

const Component = Mod['${componentName}'] || Mod.default;

function hydrate() {
  const dataElement = document.getElementById("__BUNSTONE_DATA__");
  const data = dataElement ? JSON.parse(dataElement.textContent || "{}") : {};

  if (typeof document !== 'undefined' && Component) {
    const root = document.getElementById("root");
    if (root) {
      try {
        hydrateRoot(root, React.createElement(Component, data));
        console.log('[Bunstone] Hydration successful for component: ${componentName}');
      } catch (e) {
        console.error('[Bunstone] Hydration failed for component: ${componentName}', e);
      }
    } else {
      console.error('[Bunstone] Root element "root" not found for hydration.');
    }
  } else {
    console.error('[Bunstone] Component ${componentName} not found in bundle.');
  }
}

// Ensure DOM is fully loaded before hydrating
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
        `;

        writeFileSync(entryPath, entryContent);

        const bundleName = `${componentName.toLowerCase()}.bundle.js`;
        await this.bundle(entryPath, bundleName);
        this.viewBundles.set(componentName, bundleName);
        this.viewBundles.set(componentName.toLowerCase(), bundleName);
      }
    }
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
    context: any,
    controller: any,
    method: any
  ) {
    const args = await processParameters(context, controller, method);
    const result = await controller[method](...args);

    const component = Reflect.getMetadata(RENDER_METADATA, controller, method);
    if (component) {
      context.set.headers["Content-Type"] = "text/html; charset=utf8";

      const componentName = component.name || component.displayName;
      const bundle =
        result?.bundle ||
        this.viewBundles.get(componentName) ||
        this.viewBundles.get(componentName.toLowerCase());

      this.logger.log(
        `Rendering component: ${componentName}, bundle found: ${
          bundle || "none"
        }`
      );

      if (!bundle) {
        this.logger.warn(
          `No client bundle found for component: ${componentName}. useEffect and other hooks will not work on the client.`
        );
      }

      const title = result?.title || "Bunstone App";

      const stream = await renderToReadableStream(
        React.createElement(
          Layout as any,
          { title, data: result, bundle },
          React.createElement(component, result)
        )
      );

      return new Response(stream, {
        headers: { "Content-Type": "text/html; charset=utf8" },
      });
    }

    // Handle direct JSX return
    if (React.isValidElement(result)) {
      const stream = await renderToReadableStream(result as React.ReactElement);
      return new Response(stream, {
        headers: { "Content-Type": "text/html; charset=utf8" },
      });
    }

    return result;
  }

  private static registerModules(module: any) {
    const isGlobal = Reflect.getMetadata("dip:module:global", module);
    if (isGlobal) {
      const injectables: Map<any, any> = Reflect.getMetadata(
        "dip:injectables",
        module
      );
      if (injectables) {
        for (const [key, value] of injectables.entries()) {
          GlobalRegistry.register(key, value);
        }
      }
    }

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
      controller = Object.assign(
        controller,
        AppStartup.getControllerHandler(module, controllerInstance)
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
          Reflect.getMetadata(API_TAGS_METADATA, controllerInstance) || [];
        const methodTags =
          Reflect.getMetadata(
            API_TAGS_METADATA,
            controllerInstance.prototype,
            method.methodName
          ) || [];
        const operation = Reflect.getMetadata(
          API_OPERATION_METADATA,
          controllerInstance.prototype,
          method.methodName
        );
        const responsesMetadata =
          Reflect.getMetadata(
            API_RESPONSE_METADATA,
            controllerInstance.prototype,
            method.methodName
          ) || [];

        const tags = [...new Set([...controllerTags, ...methodTags])];
        const responses: Record<string, any> = {};
        responsesMetadata.forEach((res: any) => {
          responses[res.status.toString()] = {
            description: res.description,
            content: res.type
              ? {
                  "application/json": {
                    schema: res.type,
                  },
                }
              : undefined,
          };
        });

        // OpenAPI Headers
        const controllerHeaders =
          Reflect.getMetadata(API_HEADERS_METADATA, controllerInstance) || [];
        const methodHeaders =
          Reflect.getMetadata(
            API_HEADERS_METADATA,
            controllerInstance.prototype,
            method.methodName
          ) || [];
        const allHeaders = [...controllerHeaders, ...methodHeaders];
        const parameters = allHeaders.map((h: any) => ({
          name: h.name,
          in: "header",
          description: h.description,
          required: h.required,
          schema: h.schema || { type: "string" },
        }));

        // Extract Schemas for OpenAPI
        const paramsMetadata =
          Reflect.getMetadata(
            PARAM_METADATA_KEY,
            controllerInstance.prototype,
            method.methodName
          ) || [];

        const bodySchema = paramsMetadata.find(
          (p: any) => p.type === ParamType.BODY
        )?.options?.zodSchema;
        const querySchema = paramsMetadata.find(
          (p: any) => p.type === ParamType.QUERY
        )?.options?.zodSchema;
        const paramsSchema = paramsMetadata.find(
          (p: any) => p.type === ParamType.PARAM
        )?.options?.zodSchema;

        // Resolve Guard dependencies
        let guardInstance: any;
        if (method.guard) {
          const guardParamsTypes =
            Reflect.getMetadata("design:paramtypes", method.guard) || [];
          const guardDependencies = resolveDependencies(
            guardParamsTypes,
            injectables
          );
          guardInstance = new method.guard(...guardDependencies);
        }

        (AppStartup.elysia as any)[httpMethod](
          method.pathname,
          (req: any) =>
            AppStartup.executeControllerMethod(
              req,
              controller,
              method.methodName
            ),
          {
            body: bodySchema,
            query: querySchema,
            params: paramsSchema,
            detail: {
              tags,
              summary: operation?.summary,
              description: operation?.description,
              responses,
              parameters,
            },
            beforeHandle(req: any) {
              if (!guardInstance) return;
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
