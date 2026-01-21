import "reflect-metadata";
import { TestingModule } from "./testing-module";
import {
  GlobalRegistry,
  OverrideRegistry,
} from "../utils/dependency-injection";

import { Module } from "../module";
import type { ModuleConfig } from "../types/module-config";

/**
 * Builder for creating a TestingModule.
 * Allows overriding providers with mocks or custom values.
 */
export class TestingModuleBuilder {
  private readonly overrides = new Map<any, any>();

  constructor(private readonly metadata: ModuleConfig) {}

  /**
   * Starts the process of overriding a provider.
   * @param type The provider class to override.
   */
  overrideProvider(type: any) {
    return {
      useValue: (value: any) => {
        this.overrides.set(type, value);
        return this;
      },
    };
  }

  /**
   * Compiles the module with the provided overrides.
   * @returns A TestingModule instance.
   */
  async compile(): Promise<TestingModule> {
    // Clear global registries to ensure test isolation
    GlobalRegistry.clear();
    OverrideRegistry.clear();

    // Create a temporary class to act as the test root module
    @Module(this.metadata)
    class TestRootModule {}

    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      TestRootModule,
    );

    // Apply overrides
    for (const [type, value] of this.overrides.entries()) {
      OverrideRegistry.register(type, value);
      injectables.set(type, value);

      // If it's a global module, we also need to update the GlobalRegistry
      if (this.metadata.global) {
        GlobalRegistry.register(type, value);
      }

      // Also check by name for compatibility as done in resolveType
      if (typeof type === "function" && type.name) {
        for (const key of injectables.keys()) {
          if (typeof key === "function" && key.name === type.name) {
            injectables.set(key, value);
            OverrideRegistry.register(key, value);
          }
        }
      }
    }

    return new TestingModule(TestRootModule, injectables);
  }
}
