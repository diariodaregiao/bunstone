import { InjectionToken } from "@/core/injectable";

/**
 * The configuration registered with `ConfigModule.register(config)`. Inject
 * it typed as your own config:
 *
 * ```ts
 * constructor(@Inject(CONFIG) private readonly config: AppConfig) {}
 * ```
 */
export const CONFIG = new InjectionToken<Readonly<Record<string, unknown>>>(
	"Config",
);
