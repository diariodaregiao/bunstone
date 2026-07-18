import type { Container, Provider } from "@/core/container";
import type { Constructor, Token } from "@/core/injectable";
import { runLifecycle } from "@/core/lifecycle";
import { compileModules, type ModuleMetadata } from "@/core/module";
import { wireCqrs } from "@/cqrs/cqrs-module";
import { HttpServer, type HttpServerOptions } from "@/http/server";
import { collectGateways } from "@/http/websocket";
import { TestApp } from "./test-app";

export class TestingModule {
	constructor(
		readonly container: Container,
		private readonly controllers: Constructor[],
		private readonly instances: readonly unknown[],
	) {}

	get<T>(token: Token<T>): T {
		return this.container.resolve(token);
	}

	createTestApp(options: HttpServerOptions = {}): TestApp {
		const gateways = collectGateways(this.instances);
		const server = new HttpServer(
			this.container,
			this.controllers,
			options,
			gateways,
		);
		return new TestApp(server);
	}

	async close(): Promise<void> {
		await runLifecycle(this.instances, "onModuleDestroy", true);
	}
}

class OverrideBinding {
	constructor(
		private readonly builder: TestingModuleBuilder,
		private readonly token: Token,
	) {}

	useValue(value: unknown): TestingModuleBuilder {
		return this.builder.addOverride({ provide: this.token, useValue: value });
	}

	useClass(cls: Constructor): TestingModuleBuilder {
		return this.builder.addOverride({ provide: this.token, useClass: cls });
	}
}

export class TestingModuleBuilder {
	private readonly overrides: Provider[] = [];

	constructor(private readonly metadata: ModuleMetadata) {}

	overrideProvider(token: Token): OverrideBinding {
		return new OverrideBinding(this, token);
	}

	addOverride(provider: Provider): TestingModuleBuilder {
		this.overrides.push(provider);
		return this;
	}

	async compile(): Promise<TestingModule> {
		class TestRootModule {}
		const { container, controllers } = compileModules({
			module: TestRootModule,
			imports: this.metadata.imports ?? [],
			controllers: this.metadata.controllers ?? [],
			providers: [...(this.metadata.providers ?? []), ...this.overrides],
		});

		container.instantiateAll();
		const instances = container.getInstances();
		await runLifecycle(instances, "onModuleInit");
		wireCqrs(container, instances);

		return new TestingModule(container, controllers, instances);
	}
}

export const Test = {
	createTestingModule(metadata: ModuleMetadata = {}): TestingModuleBuilder {
		return new TestingModuleBuilder(metadata);
	},
};
