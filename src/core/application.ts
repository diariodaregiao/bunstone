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
		container.instantiateAll();
		const instances = container.getInstances();

		await runLifecycle(instances, "onModuleInit");
		wireCqrs(container, instances);
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
		await runLifecycle(instances, "onApplicationBootstrap");

		const disposables = new DisposableRegistry();
		const scheduler = new Scheduler();
		scheduler.start(instances);
		disposables.add(() => scheduler.stopAll(), "scheduler");
		if (container.has(RabbitConnection)) {
			disposables.add(
				() => container.resolve(RabbitConnection).close(),
				"rabbit",
			);
		}

		return new Application(
			container,
			httpServer,
			disposables,
			instances,
			options,
			readiness,
		);
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
		await this.httpServer.stop(this.options.shutdownTimeoutMs);
		await runLifecycle(this.instances, "onModuleDestroy", true);
		await this.disposables.disposeAll();
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
