import { AppStartup } from "../app-startup";
import type { Options } from "../types/options";
import { OverrideRegistry } from "../utils/dependency-injection";
import { TestApp } from "./test-app";

/**
 * A reference to a compiled testing module.
 * Provides access to the DI container and allows creating a TestApp.
 */
export class TestingModule {
	constructor(
		private readonly module: any,
		private readonly injectables: Map<any, any>,
	) {}

	/**
	 * Retrieves an instance of a provider from the module's dependency container.
	 * @param type The provider class to retrieve.
	 * @returns The resolved instance.
	 */
	get<T>(type: new (...args: any[]) => T): T {
		if (OverrideRegistry.has(type)) {
			return OverrideRegistry.get(type);
		}

		const instance = this.injectables.get(type);
		if (!instance) {
			throw new Error(`Provider ${type.name} not found in TestingModule.`);
		}
		return instance;
	}

	/**
	 * Creates a TestApp instance to perform E2E tests.
	 * @param options Application startup options.
	 * @returns A TestApp instance.
	 */
	async createTestApp(options?: Options): Promise<TestApp> {
		const appRef = await AppStartup.create(this.module, options);
		return new TestApp(appRef.getElysia());
	}
}
