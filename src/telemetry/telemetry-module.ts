import { Injectable } from "../injectable";
import { Module } from "../module";
import type { OnModuleDestroy } from "../on-module/on-module-destroy";
import type { TelemetryOptions } from "./interfaces/telemetry-options.interface";
import { TelemetrySdk } from "./telemetry.sdk";

/**
 * Internal service that hooks into Bunstone's lifecycle to gracefully shut down
 * the OpenTelemetry SDK when the application stops.
 */
@Injectable()
class TelemetryService implements OnModuleDestroy {
	async onModuleDestroy(): Promise<void> {
		await TelemetrySdk.shutdown();
	}
}

/**
 * Bunstone module that bootstraps the OpenTelemetry SDK.
 *
 * Register it as early as possible inside your root `AppModule` imports so that
 * the TracerProvider and MeterProvider are configured before any routes,
 * consumers, or workers start handling requests.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TelemetryModule.register({
 *       serviceName: "orders-api",
 *       serviceVersion: "2.1.0",
 *       environment: process.env.NODE_ENV ?? "production",
 *       traces: {
 *         otlp: { endpoint: "http://otel-collector:4318" },
 *         sampleRatio: 1.0,
 *       },
 *       metrics: {
 *         otlp: { endpoint: "http://otel-collector:4318" },
 *         exportIntervalMillis: 30_000,
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
	providers: [TelemetryService],
	global: true,
})
export class TelemetryModule {
	/**
	 * Initializes the OpenTelemetry SDK with the given options and returns the
	 * module class so it can be used in `@Module({ imports: [...] })`.
	 */
	static register(options: TelemetryOptions): typeof TelemetryModule {
		TelemetrySdk.initialize(options);
		return TelemetryModule;
	}
}
