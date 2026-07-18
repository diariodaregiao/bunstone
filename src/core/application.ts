import { HttpServer, type HttpServerOptions } from "@/http/server";
import type { BunServer } from "@/http/types";
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
	) {}

	static async create(
		rootModule: Constructor,
		options: ApplicationOptions = {},
	): Promise<Application> {
		const { container, controllers } = compileModules(rootModule);
		container.instantiateAll();
		const instances = container.getInstances();

		await runLifecycle(instances, "onModuleInit");
		const httpServer = new HttpServer(container, controllers, options);
		await runLifecycle(instances, "onApplicationBootstrap");

		const disposables = new DisposableRegistry();
		const scheduler = new Scheduler();
		scheduler.start(instances);
		disposables.add(() => scheduler.stopAll(), "scheduler");

		return new Application(
			container,
			httpServer,
			disposables,
			instances,
			options,
		);
	}

	resolve<T>(token: Token<T>): T {
		return this.container.resolve(token);
	}

	listen(port?: number): this {
		const server = this.httpServer.listen(port);
		this.disposables.add(() => this.httpServer.stop(), "http-server");

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
		this.removeSignals();
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
