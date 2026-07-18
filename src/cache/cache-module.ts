import { RedisClient } from "bun";
import type { DynamicModule } from "@/core/module";
import { CacheService } from "./cache.service";
import { CACHE_CLIENT, type CacheOptions } from "./cache.tokens";

export class CacheModule {
	static register(options: CacheOptions = {}): DynamicModule {
		return {
			module: CacheModule,
			global: true,
			providers: [
				{
					provide: CACHE_CLIENT,
					useFactory: () =>
						options.url ? new RedisClient(options.url) : new RedisClient(),
				},
				CacheService,
			],
		};
	}
}
