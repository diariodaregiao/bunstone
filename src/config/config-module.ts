import type { DynamicModule } from "@/core/module";
import { CONFIG } from "./config.tokens";

export class ConfigModule {
	/**
	 * Makes a configuration built with `defineConfig` injectable everywhere
	 * under the `CONFIG` token. Validation already happened when the config
	 * was defined, so registering cannot fail later in the boot.
	 */
	static register(config: object): DynamicModule {
		return {
			module: ConfigModule,
			global: true,
			providers: [{ provide: CONFIG, useValue: config }],
			exports: [CONFIG],
		};
	}
}
