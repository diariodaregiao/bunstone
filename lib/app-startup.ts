import { statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { cors } from "@elysiajs/cors";
import { html } from "@elysiajs/html";
import jwt from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { type Job, Worker } from "bullmq";
import Elysia from "elysia";
import scheduler from "node-cron";
import React from "react";
import { renderToReadableStream } from "react-dom/server";
import "reflect-metadata";
import z4 from "zod/v4";
import { BULLMQ_PROCESSOR_METADATA } from "./bullmq/constants";
import { QueueService } from "./bullmq/queue.service";
import { Layout } from "./components/layout";
import { PARAM_METADATA_KEY } from "./constants";
import { CommandBus } from "./cqrs/command-bus";
import { COMMAND_HANDLER_METADATA } from "./cqrs/decorators/command-handler.decorator";
import { EVENT_HANDLER_METADATA } from "./cqrs/decorators/event-handler.decorator";
import { QUERY_HANDLER_METADATA } from "./cqrs/decorators/query-handler.decorator";
import { SAGA_METADATA } from "./cqrs/decorators/saga.decorator";
import { EventBus } from "./cqrs/event-bus";
import { QueryBus } from "./cqrs/query-bus";
import { ModuleInitializationError } from "./errors";
import { HttpException, UnauthorizedException } from "./http-exceptions";
import { HTTP_HEADERS_METADATA } from "./http-methods";
import { ParamType, processParameters } from "./http-params";
import type { OnModuleDestroy } from "./on-module/on-module-destroy";
import type { OnModuleInit } from "./on-module/on-module-init";
import {
	API_HEADERS_METADATA,
	API_OPERATION_METADATA,
	API_RESPONSE_METADATA,
	API_TAGS_METADATA,
} from "./openapi";
import type { RabbitMessage } from "./rabbitmq/interfaces/rabbitmq-message.interface";
import type { RabbitMQMethodDescriptor } from "./rabbitmq/mappers/map-providers-with-rabbitmq";
import { RabbitMQConnection } from "./rabbitmq/rabbitmq-connection";
import type { RateLimitMetadata } from "./ratelimit/ratelimit.decorator";
import { RateLimitService } from "./ratelimit/ratelimit.service";
import { RENDER_METADATA } from "./render";
import type { Options, RateLimitGlobalConfig } from "./types/options";
import { Bundler } from "./utils/bundler";
import { cwd } from "./utils/cwd";
import {
	GlobalRegistry,
	resolveDependencies,
} from "./utils/dependency-injection";
import { ErrorFormatter } from "./utils/error-formatter";
import { Logger } from "./utils/logger";

/**
 * Main entry point for the Bunstone application.
 * Handles module registration, route setup, and server startup.
 */
export class AppStartup {
	private static elysia: Elysia = new Elysia();
	private static readonly logger = new Logger(AppStartup.name);
	private static readonly registeredSagas = new WeakSet<any>();
	private static initializedModuleHooks = new WeakSet<OnModuleInit>();
	private static destroyedModuleHooks = new WeakSet<OnModuleDestroy>();
	private static destroyPromise: Promise<void> | null = null;
	private static hasBeenDestroyed = false;
	private static rootModule: any;
	private static globalRateLimitConfig: RateLimitGlobalConfig | undefined;
	private static rateLimitService: RateLimitService = new RateLimitService();

	/**
	 * Initializes the application from a root module.
	 *
	 * @param module The root module of the application.
	 * @param options Optional configuration (e.g., CORS).
	 * @returns An object with a `listen` method to start the server.
	 */
	static async create(module: any, options?: Options) {
		try {
			AppStartup.elysia = new Elysia(); // Reset for each creation
			AppStartup.rootModule = module;
			AppStartup.initializedModuleHooks = new WeakSet<OnModuleInit>();
			AppStartup.destroyedModuleHooks = new WeakSet<OnModuleDestroy>();
			AppStartup.destroyPromise = null;
			AppStartup.hasBeenDestroyed = false;

			const publicExists = await Bun.file("public").exists();
			// Ensure public directory exists before static plugin uses it
			if (!publicExists) await mkdir("./public", { recursive: true });

			AppStartup.elysia.use(html());
			AppStartup.elysia.use(
				staticPlugin({
					assets: "public",
					prefix: "/public",
				}),
			);

			if (options?.viewsDir) {
				Bundler.buildViews(options.viewsDir).catch((err) => {
					AppStartup.logger.error(
						`Failed to auto-bundle views: ${err.message}`,
					);
				});
			}

			AppStartup.elysia.error({
				HttpException,
			});

			AppStartup.elysia.onError(({ code, error, set }) => {
				if (error instanceof HttpException) {
					set.status = error.getStatus();
					return error.getResponse();
				}

				if (code === "VALIDATION") {
					set.status = 400;

					const extractField = (path: any): string => {
						if (Array.isArray(path)) {
							return path
								.join(".")
								.replace(/^body\./, "")
								.replace(/^query\./, "")
								.replace(/^params\./, "");
						}
						if (typeof path === "string") {
							return path
								.replace(/^body\./, "")
								.replace(/^query\./, "")
								.replace(/^params\./, "");
						}
						return "";
					};

					const allErrors = (error as any).all;
					const errors =
						Array.isArray(allErrors) && allErrors.length > 0
							? allErrors.map((err: any) => ({
									field: extractField(err.path),
									message: err.message,
								}))
							: [
									{
										field: extractField((error as any).path),
										message: error.message,
									},
								];

					return {
						status: 400,
						errors,
					};
				}

				set.status = 500;
				return {
					message:
						error instanceof Error ? error.message : "Internal Server Error",
				};
			});

			AppStartup.elysia.onStop(async () => {
				await AppStartup.executeDestroyLifecycle();
			});

			if (options?.cors) {
				AppStartup.elysia.use(cors(options.cors));
			}

			if (options?.swagger) {
				const swaggerPath = options.swagger.path || "/swagger";

				if (options.swagger.auth) {
					const { username, password } = options.swagger.auth;
					const expectedToken = Buffer.from(`${username}:${password}`).toString(
						"base64",
					);

					AppStartup.elysia.onBeforeHandle(({ request, set }) => {
						const url = new URL(request.url);
						if (url.pathname.startsWith(swaggerPath)) {
							const authHeader = request.headers.get("authorization");
							let validCredentials = false;

							if (authHeader) {
								const parts = authHeader.trim().split(/\s+/);
								if (parts.length >= 2) {
									const scheme = parts[0] ?? "";
									const token = parts.slice(1).join(" ");
									if (
										scheme.toLowerCase() === "basic" &&
										token === expectedToken
									) {
										validCredentials = true;
									}
								}
							}
							if (!validCredentials) {
								set.status = 401;
								set.headers["WWW-Authenticate"] =
									'Basic realm="Swagger Documentation"';
								return new Response("Unauthorized", { status: 401 });
							}
						}
					});
				}

				AppStartup.elysia.use(
					swagger({
						path: swaggerPath,
						documentation: options.swagger.documentation,
					}),
				);
			}

			// Store global rate limit config
			AppStartup.globalRateLimitConfig = options?.rateLimit;

			await AppStartup.registerModules(module);
			return {
				/**
				 * Starts the server on the specified port.
				 * @param port The port number to listen on.
				 */
				listen: AppStartup.listen,
				/**
				 * Returns the underlying Elysia instance.
				 */
				getElysia: () => AppStartup.elysia,
			};
		} catch (error: any) {
			ErrorFormatter.format(error);
			process.exit(1);
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

	private static async executeDestroyLifecycle() {
		if (!AppStartup.rootModule) {
			return;
		}

		if (AppStartup.hasBeenDestroyed) {
			return;
		}

		if (AppStartup.destroyPromise) {
			await AppStartup.destroyPromise;
			return;
		}

		AppStartup.destroyPromise = (async () => {
			await AppStartup.destroyModules(AppStartup.rootModule);
			AppStartup.hasBeenDestroyed = true;
		})()
			.catch((error) => {
				AppStartup.logger.error(
					`Error while executing OnModuleDestroy hooks: ${error?.message || error}`,
				);
				throw error;
			})
			.finally(() => {
				AppStartup.destroyPromise = null;
			});

		await AppStartup.destroyPromise;
	}

	private static async executeControllerMethod(
		context: any,
		controller: any,
		method: any,
	) {
		const args = await processParameters(context, controller, method);
		const result = await controller[method](...args);

		const customHeaders = Reflect.getMetadata(
			HTTP_HEADERS_METADATA,
			controller,
			method,
		);

		if (customHeaders) {
			for (const [name, value] of Object.entries(customHeaders)) {
				context.set.headers[name] = value as string;
			}
		}

		const component = Reflect.getMetadata(RENDER_METADATA, controller, method);
		if (component) {
			if (!context.set.headers["Content-Type"]) {
				context.set.headers["Content-Type"] = "text/html; charset=utf8";
			}

			const componentName = component.name || component.displayName;
			const bundleName = `${componentName.toLowerCase()}.bundle.js`;
			const bundle = `/public/${bundleName}`;

			AppStartup.logger.log(`Rendering component: ${componentName}`);

			if (!bundle) {
				AppStartup.logger.warn(
					`No client bundle found for component: ${componentName}. useEffect and other hooks will not work on the client.`,
				);
			}

			const title = result?.title || "Bunstone App";

			const stream = await renderToReadableStream(
				React.createElement(
					Layout as any,
					{ title, data: result, bundle },
					React.createElement(component, result),
				),
			);

			return new Response(stream, {
				headers: context.set.headers,
			});
		}

		// Handle direct JSX return
		if (React.isValidElement(result)) {
			const stream = await renderToReadableStream(result as React.ReactElement);
			if (!context.set.headers["Content-Type"]) {
				context.set.headers["Content-Type"] = "text/html; charset=utf8";
			}

			return new Response(stream, {
				headers: context.set.headers,
			});
		}

		if (customHeaders && !(result instanceof Response)) {
			return new Response(
				typeof result === "string" ? result : JSON.stringify(result),
				{
					headers: context.set.headers,
					status: context.set.status || 200,
				},
			);
		}

		return result;
	}

	private static async registerModules(module: any) {
		const isGlobal = Reflect.getMetadata("dip:module:global", module);
		if (isGlobal) {
			const injectables: Map<any, any> = Reflect.getMetadata(
				"dip:injectables",
				module,
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
		AppStartup.registerBullMqWorkers(module);
		AppStartup.registerCqrsHandlers(module);
		AppStartup.registerRabbitMQConsumers(module);

		const modules = Reflect.getMetadata("dip:modules", module) || [];

		for (const mod of modules) {
			await AppStartup.registerModules(mod);
		}

		await AppStartup.executeOnModuleInit(module);
	}

	private static async destroyModules(module: any) {
		const modules = Reflect.getMetadata("dip:modules", module) || [];

		for (const mod of modules) {
			await AppStartup.destroyModules(mod);
		}

		await AppStartup.executeOnModuleDestroy(module);
	}

	private static async executeOnModuleInit(module: any) {
		const injectables: Map<any, any> | undefined = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		if (!injectables) {
			return;
		}

		for (const provider of injectables.values()) {
			if (AppStartup.initializedModuleHooks.has(provider)) {
				continue;
			}

			if (AppStartup.hasOnModuleInit(provider)) {
				AppStartup.initializedModuleHooks.add(provider);
				await provider.onModuleInit();
			}
		}
	}

	private static async executeOnModuleDestroy(module: any) {
		const injectables: Map<any, any> | undefined = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		if (!injectables) {
			return;
		}

		for (const provider of injectables.values()) {
			if (AppStartup.destroyedModuleHooks.has(provider)) {
				continue;
			}

			if (AppStartup.hasOnModuleDestroy(provider)) {
				AppStartup.destroyedModuleHooks.add(provider);
				await provider.onModuleDestroy();
			}
		}
	}

	private static hasOnModuleInit(provider: any): provider is OnModuleInit {
		return !!provider && typeof provider.onModuleInit === "function";
	}

	private static hasOnModuleDestroy(
		provider: any,
	): provider is OnModuleDestroy {
		return !!provider && typeof provider.onModuleDestroy === "function";
	}

	private static registerRoutes(module: any) {
		const controllers: Map<
			any,
			{
				httpMethod: string;
				pathname: string;
				methodName: string;
				guard?: any;
				rateLimit?: RateLimitMetadata;
			}[]
		> = Reflect.getMetadata("dip:module:routes", module);

		if (!controllers) {
			return;
		}

		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			module,
		);
		for (const item of controllers.entries()) {
			const [controllerInstance, methods] = item;
			const paramsTypes =
				Reflect.getMetadata("design:paramtypes", controllerInstance) || [];
			const dependencies = resolveDependencies(paramsTypes, injectables);
			let controller = new controllerInstance(...dependencies);
			controller = Object.assign(
				controller,
				AppStartup.getControllerHandler(module, controllerInstance),
			);

			for (const method of methods) {
				AppStartup.logger.log(
					`Registering ${method.httpMethod} route: ${method.pathname}`,
				);
				const httpMethod = method.httpMethod.toLowerCase();
				if (!(httpMethod in AppStartup.elysia)) {
					throw ModuleInitializationError.unsupportedHttpMethod(
						method.httpMethod,
					);
				}

				// OpenAPI Metadata
				const controllerTags =
					Reflect.getMetadata(API_TAGS_METADATA, controllerInstance) || [];
				const methodTags =
					Reflect.getMetadata(
						API_TAGS_METADATA,
						controllerInstance.prototype,
						method.methodName,
					) || [];
				const operation = Reflect.getMetadata(
					API_OPERATION_METADATA,
					controllerInstance.prototype,
					method.methodName,
				);
				const responsesMetadata =
					Reflect.getMetadata(
						API_RESPONSE_METADATA,
						controllerInstance.prototype,
						method.methodName,
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

				// Add 429 response to OpenAPI if rate limiting is configured
				const hasRateLimit =
					method.rateLimit ||
					(AppStartup.globalRateLimitConfig?.enabled !== false &&
						AppStartup.globalRateLimitConfig);
				if (hasRateLimit) {
					responses["429"] = {
						description: "Too Many Requests - Rate limit exceeded",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										status: { type: "number" },
										message: { type: "string" },
									},
								},
							},
						},
					};
				}

				// OpenAPI Headers
				const controllerHeaders =
					Reflect.getMetadata(API_HEADERS_METADATA, controllerInstance) || [];
				const methodHeaders =
					Reflect.getMetadata(
						API_HEADERS_METADATA,
						controllerInstance.prototype,
						method.methodName,
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
						method.methodName,
					) || [];

				const bodySchema = paramsMetadata.find(
					(p: any) => p.type === ParamType.BODY,
				)?.options?.zodSchema;
				const querySchema = paramsMetadata.find(
					(p: any) => p.type === ParamType.QUERY,
				)?.options?.zodSchema;
				const paramsSchema = paramsMetadata.find(
					(p: any) => p.type === ParamType.PARAM,
				)?.options?.zodSchema;

				// Resolve Guard dependencies
				let guardInstance: any;
				if (method.guard) {
					const guardParamsTypes =
						Reflect.getMetadata("design:paramtypes", method.guard) || [];
					const guardDependencies = resolveDependencies(
						guardParamsTypes,
						injectables,
					);
					guardInstance = new method.guard(...guardDependencies);
				}

				// Build effective rate limit config
				const effectiveRateLimit = AppStartup.buildEffectiveRateLimit(
					method.rateLimit,
				);

				(AppStartup.elysia as any)[httpMethod](
					method.pathname,
					(req: any) =>
						AppStartup.executeControllerMethod(
							req,
							controller,
							method.methodName,
						),
					{
						...(bodySchema && { body: z4.toJSONSchema(bodySchema) }),
						...(querySchema && { query: z4.toJSONSchema(querySchema) }),
						...(paramsSchema && { params: z4.toJSONSchema(paramsSchema) }),
						detail: {
							...(tags && { tags }),
							...(operation?.summary && { summary: operation.summary }),
							...(operation?.description && {
								description: operation.description,
							}),
							...(responses && { responses }),
							...(parameters.length > 0 && { parameters }),
						},
						async beforeHandle(req: any) {
							// Check rate limit first
							if (effectiveRateLimit) {
								const result = await AppStartup.rateLimitService.process(
									req,
									effectiveRateLimit,
								);

								// Set rate limit headers on the response
								if (req.set?.headers) {
									Object.entries(result.headers).forEach(([key, value]) => {
										if (value !== undefined) {
											req.set.headers[key] = value;
										}
									});
								}

								if (!result.allowed) {
									req.set.status = 429;
									return {
										status: 429,
										message:
											effectiveRateLimit.message ||
											"Too many requests, please try again later.",
									};
								}
							}

							// Then check guard
							if (!guardInstance) return;
							const isValid = guardInstance.validate(req);
							if (isValid instanceof Promise) {
								return isValid.then((valid) => {
									if (!valid) {
										throw new UnauthorizedException();
									}
								});
							} else {
								if (!isValid) {
									throw new UnauthorizedException();
								}
							}
						},
					},
				);
			}
		}
	}

	/**
	 * Builds effective rate limit configuration by merging global config with method config
	 */
	private static buildEffectiveRateLimit(
		methodRateLimit?: RateLimitMetadata,
	): RateLimitMetadata | undefined {
		const global = AppStartup.globalRateLimitConfig;

		// If method has explicit rate limit config
		if (methodRateLimit) {
			// If explicitly disabled at method level, return undefined
			if (methodRateLimit.enabled === false) {
				return undefined;
			}

			// Merge method config with global config for missing properties
			return {
				enabled: true,
				max: methodRateLimit.max ?? global?.max ?? 100,
				windowMs: methodRateLimit.windowMs ?? global?.windowMs ?? 60000,
				storage: methodRateLimit.storage ?? global?.storage,
				keyGenerator: methodRateLimit.keyGenerator ?? global?.keyGenerator,
				skipHeader: methodRateLimit.skipHeader ?? global?.skipHeader,
				skip: methodRateLimit.skip ?? global?.skip,
				message: methodRateLimit.message ?? global?.message,
			};
		}

		// If global rate limit is enabled and method doesn't have config
		if (global?.enabled !== false && global) {
			return {
				enabled: true,
				max: global.max ?? 100,
				windowMs: global.windowMs ?? 60000,
				storage: global.storage,
				keyGenerator: global.keyGenerator,
				skipHeader: global.skipHeader,
				skip: global.skip,
				message: global.message,
			};
		}

		return undefined;
	}

	private static registerTimeouts(module: any) {
		const providersTimeouts: Map<any, { delay: number; methodName: string }[]> =
			Reflect.getMetadata("dip:timeouts", module);

		if (!providersTimeouts) {
			return;
		}

		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		for (const item of providersTimeouts.entries()) {
			const [providerInstance, timeouts] = item;
			const provider =
				injectables?.get(providerInstance) || new providerInstance();

			for (const timeout of timeouts) {
				AppStartup.logger.log(
					`Scheduling timeout for method: ${timeout.methodName} with delay: ${timeout.delay}ms`,
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

		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		for (const item of providersCron.entries()) {
			const [providerInstance, crons] = item;
			const provider =
				injectables?.get(providerInstance) || new providerInstance();

			for (const cron of crons) {
				AppStartup.logger.log(`Scheduling cron for method: ${cron.methodName}`);
				scheduler.schedule(cron.expression, () => {
					provider[cron.methodName]();
				});
			}
		}
	}

	private static registerBullMqWorkers(module: any) {
		const providersBullMq: Map<any, { name?: string; methodName: string }[]> =
			Reflect.getMetadata("dip:bullmq", module);

		if (!providersBullMq) {
			return;
		}

		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		const _queueService: QueueService = injectables?.get(QueueService);
		const redisOptions = (QueueService as any).redisOptions;

		for (const item of providersBullMq.entries()) {
			const [providerClass, methods] = item;
			const provider = injectables?.get(providerClass) || new providerClass();

			const processorOptions = Reflect.getMetadata(
				BULLMQ_PROCESSOR_METADATA,
				providerClass,
			);

			if (!processorOptions) {
				continue;
			}

			const { queueName, concurrency } = processorOptions;

			AppStartup.logger.log(
				`Registering BullMQ worker for queue: ${queueName}`,
			);

			new Worker(
				queueName,
				async (job: Job) => {
					// Find the best matching method
					// 1. Exact name match
					// 2. Default handler (no name specified)
					let handler = methods.find((m) => m.name === job.name);
					if (!handler) {
						handler = methods.find((m) => !m.name);
					}

					if (handler) {
						return await provider[handler.methodName](job);
					}

					AppStartup.logger.warn(
						`No handler found for job ${job.name} in queue ${queueName}`,
					);
				},
				{
					connection: redisOptions,
					concurrency: concurrency || 1,
				},
			);
		}
	}

	/**
	 * Sets up RabbitMQ consumers for every provider that has `@RabbitSubscribe`
	 * methods registered in the given module.
	 *
	 * Queue mode (fan-out): all handlers subscribed to the same named queue share a
	 * single AMQP consumer. Every message is delivered to ALL handlers in declaration
	 * order. A "settle guard" ensures ack/nack/reject is called only once per message
	 * regardless of how many handlers invoke it.
	 *
	 * Routing-key mode: each handler gets its own exclusive auto-delete queue bound
	 * to the exchange, so the broker itself handles fan-out.
	 */
	private static registerRabbitMQConsumers(module: any): void {
		const providersRabbitMQ: Map<any, RabbitMQMethodDescriptor[]> | undefined =
			Reflect.getMetadata("dip:rabbitmq", module);

		if (!providersRabbitMQ || providersRabbitMQ.size === 0) {
			return;
		}

		const injectables: Map<any, any> | undefined = Reflect.getMetadata(
			"dip:injectables",
			module,
		);

		/**
		 * Matches a RabbitMQ topic routing key pattern against a concrete routing key.
		 * Supports `*` (exactly one word) and `#` (zero or more words).
		 */
		function matchRoutingKey(pattern: string, routingKey: string): boolean {
			if (pattern === routingKey) return true;
			if (!pattern.includes("*") && !pattern.includes("#")) return false;

			const pp = pattern.split(".");
			const kp = routingKey.split(".");

			function go(pi: number, ki: number): boolean {
				if (pi === pp.length && ki === kp.length) return true;
				if (pi === pp.length) return false;
				if (pp[pi] === "#") {
					for (let j = ki; j <= kp.length; j++) {
						if (go(pi + 1, j)) return true;
					}
					return false;
				}
				if (ki === kp.length) return false;
				if (pp[pi] === "*" || pp[pi] === kp[ki]) return go(pi + 1, ki + 1);
				return false;
			}

			return go(0, 0);
		}

		type QueueHandler = {
			instance: any;
			descriptor: RabbitMQMethodDescriptor;
			noAck: boolean;
			providerName: string;
		};

		// Fire-and-forget – connect asynchronously so startup is never blocked
		(async () => {
			try {
				await RabbitMQConnection.initialise();
			} catch (err: any) {
				AppStartup.logger.error(
					`RabbitMQ initialisation failed: ${err.message}`,
				);
				return;
			}

			// ── Step 1: separate routing-key handlers from named-queue handlers ──
			// Named-queue handlers are grouped by queue name so that a single AMQP
			// consumer is created per queue and every message is fanned-out to all
			// registered handlers in-process.
			const queueMap = new Map<string, QueueHandler[]>();

			for (const [providerClass, descriptors] of providersRabbitMQ.entries()) {
				const instance = injectables?.get(providerClass) ?? new providerClass();

				for (const descriptor of descriptors) {
					const {
						queue,
						exchange,
						routingKey,
						noAck = false,
					} = descriptor.options;

					// ── Routing-key mode: exchange + routingKey ─────────────────────
					if (exchange && routingKey) {
						AppStartup.logger.log(
							`Registering RabbitMQ consumer for exchange: "${exchange}" routingKey: "${routingKey}" → ${providerClass.name}.${descriptor.methodName}()`,
						);

						try {
							const { channel, queueName } =
								await RabbitMQConnection.createRoutingKeyConsumerChannel(
									exchange,
									routingKey,
								);

							await channel.consume(
								queueName,
								async (raw) => {
									if (!raw) return;

									const data = (() => {
										try {
											return JSON.parse(raw.content.toString());
										} catch {
											return raw.content.toString();
										}
									})();

									const xDeath = raw.properties.headers?.["x-death"];
									const isDeadLetter =
										Array.isArray(xDeath) && xDeath.length > 0;
									const isDlqQueue = queueName.toLowerCase().includes(".dlq");

									// If the handler is on a DLQ or uses DeadLetterMessage type,
									// only process messages that have x-death headers.
									if (
										(isDlqQueue ||
											descriptor.options.queue
												?.toLowerCase()
												.includes(".dlq")) &&
										!isDeadLetter
									) {
										channel.ack(raw);
										return;
									}

									const msg: RabbitMessage = {
										data,
										raw,
										ack: () => channel.ack(raw),
										nack: (requeue = true) => channel.nack(raw, false, requeue),
										reject: () => channel.reject(raw, false),
									};

									try {
										await instance[descriptor.methodName](msg);
									} catch (err: any) {
										AppStartup.logger.error(
											`Unhandled error in RabbitMQ handler ${providerClass.name}.${descriptor.methodName}() on exchange "${exchange}" routingKey "${routingKey}": ${err.message}`,
										);
										if (!noAck) {
											channel.nack(raw, false, false);
										}
									}
								},
								{ noAck },
							);
						} catch (err: any) {
							AppStartup.logger.error(
								`Failed to register consumer for exchange "${exchange}" routingKey "${routingKey}": ${err.message}`,
							);
						}

						continue;
					}

					// ── Queue mode: collect and group by queue name ─────────────────
					if (!queue) {
						AppStartup.logger.warn(
							`@RabbitSubscribe on ${providerClass.name}.${descriptor.methodName}() has neither 'queue' nor 'exchange'+'routingKey' – skipping.`,
						);
						continue;
					}

					if (!queueMap.has(queue)) queueMap.set(queue, []);
					const queueHandlers = queueMap.get(queue) as QueueHandler[];
					queueHandlers.push({
						instance,
						descriptor,
						noAck,
						providerName: providerClass.name,
					});
				}
			}

			// ── Step 2: one AMQP consumer per unique queue, fan-out in-process ──
			for (const [queue, handlers] of queueMap.entries()) {
				// Use noAck only when every handler opts in; otherwise manual ack.
				const noAck = handlers.every((h) => h.noAck);

				const handlerList = handlers
					.map((h) => {
						const rk = h.descriptor.options.routingKey;
						return `${h.providerName}.${h.descriptor.methodName}()${rk ? ` [${rk}]` : ""}`;
					})
					.join(", ");

				AppStartup.logger.log(
					`Registering RabbitMQ consumer for queue: "${queue}" → [${handlerList}]`,
				);

				try {
					const channel = await RabbitMQConnection.getConsumerChannel(queue);

					await channel.consume(
						queue,
						async (raw) => {
							if (!raw) return; // consumer cancelled

							const data = (() => {
								try {
									return JSON.parse(raw.content.toString());
								} catch {
									return raw.content.toString();
								}
							})();

							const xDeath = raw.properties.headers?.["x-death"];
							const isDeadLetter = Array.isArray(xDeath) && xDeath.length > 0;
							const isDlqQueue = queue.toLowerCase().includes(".dlq");

							// If this is a DLQ, skip messages that don't have x-death headers
							// (i.e. someone published directly to the DLQ instead of it being a failed message)
							if (isDlqQueue && !isDeadLetter) {
								channel.ack(raw);
								return;
							}

							// Settle guard: ack/nack/reject may only be called once per
							// delivery tag regardless of how many handlers invoke it.
							let settled = false;
							const settle = (fn: () => void) => {
								if (!settled) {
									settled = true;
									fn();
								}
							};

							const msg: RabbitMessage = {
								data,
								raw,
								ack: () => settle(() => channel.ack(raw)),
								nack: (requeue = true) =>
									settle(() => channel.nack(raw, false, requeue)),
								reject: () => settle(() => channel.reject(raw, false)),
							};

							for (const {
								instance,
								descriptor,
								noAck: handlerNoAck,
								providerName,
							} of handlers) {
								// ── Routing-key filter ─────────────────────────────────────────────
								// When { queue, routingKey } is set without exchange, only dispatch
								// if the message's routing key matches the declared pattern.
								const handlerRoutingKey = descriptor.options.routingKey;
								if (
									handlerRoutingKey &&
									!matchRoutingKey(handlerRoutingKey, raw.fields.routingKey)
								) {
									continue;
								}

								try {
									await instance[descriptor.methodName](msg);
								} catch (err: any) {
									AppStartup.logger.error(
										`Unhandled error in RabbitMQ handler ${providerName}.${descriptor.methodName}() on queue "${queue}": ${err.message}`,
									);
									if (!handlerNoAck && !settled) {
										settle(() => channel.nack(raw, false, false));
									}
								}
							}

							// ── Auto-ack if no handler consumed the message ────────────────
							// All handlers were filtered out by routingKey – ack silently
							// to prevent the message from piling up as unacked.
							if (!noAck && !settled) {
								settle(() => channel.ack(raw));
							}
						},
						{ noAck },
					);
				} catch (err: any) {
					AppStartup.logger.error(
						`Failed to register consumer for queue "${queue}": ${err.message}`,
					);
				}
			}
		})();
	}

	private static registerCqrsHandlers(module: any) {
		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			module,
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
					sagaInstance.constructor,
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
											err,
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
			module,
		);

		if (!injectables) {
			return [];
		}

		return injectables.get(controller);
	}
}
