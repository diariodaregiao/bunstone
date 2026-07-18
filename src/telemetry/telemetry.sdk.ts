import { context, metrics, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	ConsoleMetricExporter,
	MeterProvider,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
	AlwaysOnSampler,
	BasicTracerProvider,
	BatchSpanProcessor,
	ConsoleSpanExporter,
	ParentBasedSampler,
	SimpleSpanProcessor,
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { TelemetryOptions } from "./interfaces/telemetry-options.interface";

/**
 * Manages the OpenTelemetry SDK lifecycle (TracerProvider + MeterProvider).
 *
 * Call `TelemetrySdk.initialize(options)` early in the application boot
 * (typically via `TelemetryModule.register()`) so that the global providers
 * are configured before any instrumented code runs.
 */
export class TelemetrySdk {
	private static initialized = false;
	private static tracerProvider: BasicTracerProvider | null = null;
	private static meterProvider: MeterProvider | null = null;

	/**
	 * Bootstraps the global TracerProvider and MeterProvider.
	 * Safe to call multiple times – only the first call takes effect.
	 */
	static initialize(options: TelemetryOptions): void {
		if (TelemetrySdk.initialized) return;
		TelemetrySdk.initialized = true;

		// Enable AsyncLocalStorage-based context propagation.
		// This is what allows SQL / CQRS / RabbitMQ spans to be
		// automatically nested under the HTTP span without explicit
		// context passing.
		const ctxManager = new AsyncLocalStorageContextManager();
		ctxManager.enable();
		context.setGlobalContextManager(ctxManager);

		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: options.serviceName,
			[ATTR_SERVICE_VERSION]: options.serviceVersion ?? "unknown",
			"deployment.environment": options.environment ?? "production",
		});

		// ── Tracing ──────────────────────────────────────────────────────────
		if (options.traces?.enabled !== false) {
			const ratio = options.traces?.sampleRatio ?? 1.0;
			const sampler =
				ratio < 1.0
					? new ParentBasedSampler({
							root: new TraceIdRatioBasedSampler(ratio),
						})
					: new AlwaysOnSampler();

			const traceEndpoint = resolveEndpoint(
				options.traces?.otlp?.endpoint,
				"/v1/traces",
			);

			const spanProcessors = [
				new BatchSpanProcessor(
					new OTLPTraceExporter({
						url: traceEndpoint,
						headers: options.traces?.otlp?.headers,
					}),
				),
				...(options.consoleExport
					? [new SimpleSpanProcessor(new ConsoleSpanExporter())]
					: []),
			];

			const tracerProvider = new BasicTracerProvider({
				resource,
				sampler,
				spanProcessors,
			});

			TelemetrySdk.tracerProvider = tracerProvider;
			trace.setGlobalTracerProvider(tracerProvider);
		}

		// ── Metrics ──────────────────────────────────────────────────────────
		if (options.metrics?.enabled !== false) {
			const readers: PeriodicExportingMetricReader[] = [];
			const intervalMs = options.metrics?.exportIntervalMillis ?? 60_000;

			if (options.consoleExport) {
				readers.push(
					new PeriodicExportingMetricReader({
						exporter: new ConsoleMetricExporter(),
						exportIntervalMillis: intervalMs,
					}),
				);
			}

			const metricEndpoint = resolveEndpoint(
				options.metrics?.otlp?.endpoint,
				"/v1/metrics",
			);
			readers.push(
				new PeriodicExportingMetricReader({
					exporter: new OTLPMetricExporter({
						url: metricEndpoint,
						headers: options.metrics?.otlp?.headers,
					}),
					exportIntervalMillis: intervalMs,
				}),
			);

			const meterProvider = new MeterProvider({ resource, readers });
			metrics.setGlobalMeterProvider(meterProvider);
			TelemetrySdk.meterProvider = meterProvider;
		}
	}

	/**
	 * Flushes pending telemetry data and shuts down both providers.
	 * Called automatically by `TelemetryService.onModuleDestroy()`.
	 */
	static async shutdown(): Promise<void> {
		await Promise.allSettled([
			TelemetrySdk.tracerProvider?.shutdown(),
			TelemetrySdk.meterProvider?.shutdown(),
		]);
		TelemetrySdk.initialized = false;
		TelemetrySdk.tracerProvider = null;
		TelemetrySdk.meterProvider = null;
	}

	/** Returns true if the SDK has been initialised */
	static isInitialized(): boolean {
		return TelemetrySdk.initialized;
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveEndpoint(configured: string | undefined, path: string): string {
	const base =
		configured ??
		process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
		"http://localhost:4318";
	return base.replace(/\/$/, "") + path;
}
