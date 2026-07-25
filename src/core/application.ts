import { wireCqrs } from "@/cqrs/cqrs-module";
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
	disposables: DisposableRegistry,
	instances: readonly unknown[],
): Promise<void> {
	await disposables.disposeAll().catch(() => undefined);
	await runLifecycle(instances, "onModuleDestroy", true, true).catch(
		() => undefined,
	);
}

export class Application {
	private readonly logger = new Logger("Application");
	private readonly signalHandlers = new Map<NodeJS.Signals, () => void>();
	private closed = false;

	private constructor(
		readonly container: Container,
		private readonly httpServer: HttpServer,
		private readonly disposables: DisposableRegistry,
		private readonly instances: readonly unknown[],
		private readonly options: ApplicationOptions,
		private readonly readiness: ReadinessState,
	) {}

	static async create(
		rootModule: Constructor,
		options: ApplicationOptions = {},
	): Promise<Application> {
		const { container, controllers } = compileModules(rootModule);
		const disposables = new DisposableRegistry();
		let instances: readonly unknown[] = [];

		// every resource is registered for disposal *before* it is started, so a
		// failure part-way through bootstrap cannot strand a timer or a socket
		try {
			container.instantiateAll();
			instances = container.getInstances();

			await runLifecycle(instances, "onModuleInit");
			wireCqrs(container, instances);

			if (container.has(RabbitConnection)) {
				disposables.add(
					() =>
						container
							.resolve(RabbitConnection)
							.close(options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS),
					"rabbit",
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
				options,
				gateways,
				isReady,
			);
			disposables.add(() => httpServer.stop(0), "http-server");
			await runLifecycle(instances, "onApplicationBootstrap");

			const scheduler = new Scheduler();
			disposables.add(() => scheduler.stopAll(), "scheduler");
			scheduler.start(instances);

			return new Application(
				container,
				httpServer,
				disposables,
				instances,
				options,
				readiness,
			);
		} catch (error) {
			await unwind(disposables, instances);
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

		await step(() => this.httpServer.stop(this.options.shutdownTimeoutMs));
		// framework resources stop producing work first, so a scheduled job or a
		// queue handler cannot fire against a pool a destroy hook already closed
		await step(() => this.disposables.disposeAll());
		await step(() =>
			runLifecycle(this.instances, "onModuleDestroy", true, true),
		);

		if (errors.length > 0) {
			throw new AggregateError(errors, "Errors occurred during shutdown.");
		}
	}

	private installSignals(): void {
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
