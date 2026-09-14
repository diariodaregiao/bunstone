import { wireCqrs } from "@/cqrs/cqrs-module";
import { assertEventStoreWiring } from "@/cqrs/event-sourcing-module";
import { resolveHealth, runChecks } from "@/http/health";
import { HttpServer, type HttpServerOptions } from "@/http/server";
import type { BunServer } from "@/http/types";
import { collectGateways } from "@/http/websocket";
import { RabbitConnection } from "@/messaging/connection";
import { wireRabbit } from "@/messaging/rabbitmq-module";
import { Scheduler } from "@/scheduling/scheduler";
import { Logger } from "@/utils/logger";
import type { Container } from "./container";
import { DisposableRegistry } from "./disposable";
import type { Constructor, Token } from "./injectable";
import { runLifecycle } from "./lifecycle";
import { compileModules } from "./module";

export interface ApplicationOptions extends HttpServerOptions {
	/**
	 * Enforces module boundaries: a provider may only resolve what its own
	 * module declares, what the modules it imports `exports`, and what a
	 * `global` module exposes. Off by default — turning it on can reject an
	 * application that today resolves across an undeclared boundary.
	 */
	strictModuleBoundaries?: boolean;

	gracefulShutdown?: boolean;

	logStartup?: boolean;

	shutdownGraceMs?: number;

	shutdownTimeoutMs?: number;
}

interface ReadinessState {
	listening: boolean;
	draining: boolean;
}

const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Best-effort teardown of a bootstrap that never finished. */
async function unwind(
	intake: DisposableRegistry,
	resources: DisposableRegistry,
	instances: readonly unknown[],
): Promise<void> {
	await intake.disposeAll().catch(() => undefined);
	await runLifecycle(instances, "onModuleDestroy", true, true).catch(
		() => undefined,
	);
	await resources.disposeAll().catch(() => undefined);
}

export class Application {
	private readonly logger = new Logger("Application");
	private readonly signalHandlers = new Map<NodeJS.Signals, () => void>();
	private closed = false;

	private constructor(
		readonly container: Container,
		private readonly httpServer: HttpServer,
		/** Stopped before destroy hooks: schedulers, queue consumers, the server. */
		private readonly intake: DisposableRegistry,
		/** Released after destroy hooks: connections a hook may still need. */
		private readonly resources: DisposableRegistry,
		private readonly instances: readonly unknown[],
		private readonly options: ApplicationOptions,
		private readonly readiness: ReadinessState,
	) {}

	static async create(
		rootModule: Constructor,
		options: ApplicationOptions = {},
	): Promise<Application> {
		const { container, controllers, moduleRateLimits } = compileModules(
			rootModule,
			options.strictModuleBoundaries === true,
		);
		const intake = new DisposableRegistry();
		const resources = new DisposableRegistry();
		let instances: readonly unknown[] = [];

		// every resource is registered for disposal *before* it is started, so a
		// failure part-way through bootstrap cannot strand a timer or a socket
		try {
			// named-module diagnostics before the container reports a raw token
			assertEventStoreWiring(container);
			container.instantiateAll();
			instances = container.getInstances();

			await runLifecycle(instances, "onModuleInit");
			wireCqrs(container, instances);

			if (container.has(RabbitConnection)) {
				// consumers stop first; the connection itself closes after the
				// destroy hooks, so a hook can still publish a final message
				intake.add(
					() =>
						container
							.resolve(RabbitConnection)
							.stopConsuming(
								options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
							),
					"rabbit-consumers",
				);
				resources.add(
					() => container.resolve(RabbitConnection).close(0),
					"rabbit-connection",
				);
			}
			await wireRabbit(container, instances);
			const gateways = collectGateways(instances);

			const readiness: ReadinessState = { listening: false, draining: false };
			const health = resolveHealth(options.health);
			const isReady = async () =>
				readiness.listening &&
				!readiness.draining &&
				(health ? await runChecks(health.checks) : true);

			const httpServer = new HttpServer(
				container,
				controllers,
				{ ...options, moduleRateLimits },
				gateways,
				isReady,
			);
			intake.add(() => httpServer.stop(0), "http-server");
			await runLifecycle(instances, "onApplicationBootstrap");

			const scheduler = new Scheduler();
			intake.add(() => scheduler.stopAll(), "scheduler");
			scheduler.start(instances);

			return new Application(
				container,
				httpServer,
				intake,
				resources,
				instances,
				options,
				readiness,
			);
		} catch (error) {
			await unwind(intake, resources, instances);
			throw error;
		}
	}

	resolve<T>(token: Token<T>): T {
		return this.container.resolve(token);
	}

	listen(port?: number): this {
		const server = this.httpServer.listen(port);
		this.readiness.listening = true;

		if (this.options.gracefulShutdown !== false) this.installSignals();
		if (this.options.logStartup !== false) {
			this.logger.log(
				`Listening on ${server.url.href} (${this.httpServer.routeList.length} routes)`,
			);
		}
		return this;
	}

	getServer(): BunServer | undefined {
		return this.httpServer.raw;
	}

	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		this.readiness.draining = true;
		this.removeSignals();

		if (this.options.shutdownGraceMs) {
			await Bun.sleep(this.options.shutdownGraceMs);
		}

		const errors: Error[] = [];
		const step = async (run: () => Promise<void>) => {
			try {
				await run();
			} catch (error) {
				errors.push(error instanceof Error ? error : new Error(String(error)));
			}
		};

		// 1. stop taking in work, so nothing new can run against a closing resource
		await step(() => this.httpServer.stop(this.options.shutdownTimeoutMs));
		await step(() => this.intake.disposeAll());
		// 2. user hooks run while their connections are still usable
		await step(() =>
			runLifecycle(this.instances, "onModuleDestroy", true, true),
		);
		// 3. release what the hooks were still allowed to use
		await step(() => this.resources.disposeAll());

		if (errors.length > 0) {
			throw new AggregateError(errors, "Errors occurred during shutdown.");
		}
	}

	private installSignals(): void {
		// listen() may be called again; without this the previous handlers stay
		// on `process` and only the last pair is ever removed
		this.removeSignals();
		for (const signal of SHUTDOWN_SIGNALS) {
			const handler = () => {
				this.close()
					.then(() => process.exit(0))
					.catch((error) => {
						this.logger.error("Error during shutdown:", error);
						process.exit(1);
					});
			};
			this.signalHandlers.set(signal, handler);
			process.on(signal, handler);
		}
	}

	private removeSignals(): void {
		for (const [signal, handler] of this.signalHandlers) {
			process.off(signal, handler);
		}
		this.signalHandlers.clear();
	}
}
