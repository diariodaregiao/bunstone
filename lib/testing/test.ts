import type { ModuleConfig } from "../types/module-config";
import { TestingModuleBuilder } from "./testing-module-builder";

/**
 * Static utility for creating testing modules.
 */
export class Test {
	/**
	 * Creates a testing module builder.
	 * @param metadata The module configuration.
	 * @returns A TestingModuleBuilder instance.
	 */
	static createTestingModule(metadata: ModuleConfig): TestingModuleBuilder {
		return new TestingModuleBuilder(metadata);
	}
}
