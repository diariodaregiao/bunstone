import {
	context as otelContext,
	metrics as otelMetrics,
	trace as otelTrace,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	ConsoleMetricExporter,
	MeterProvider,
	type MetricReader,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
	BasicTracerProvider,
	BatchSpanProcessor,
	ConsoleSpanExporter,
	SimpleSpanProcessor,
	type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface TelemetryOptions {
	serviceName: string;
	serviceVersion?: string;
	environment?: string;
	otlpEndpoint?: string;
	traces?: boolean;
	metrics?: boolean;
	console?: boolean;
	metricIntervalMillis?: number;
	spanProcessors?: SpanProcessor[];
	metricReaders?: MetricReader[];
}

export class TelemetrySdk {
	private tracerProvider?: BasicTracerProvider;
	private meterProvider?: MeterProvider;
	private started = false;

	start(options: TelemetryOptions): void {
		if (this.started) return;
		this.started = true;

		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: options.serviceName,
			[ATTR_SERVICE_VERSION]: options.serviceVersion ?? "0.0.0",
			"deployment.environment": options.environment ?? "development",
		});

		// Registering a context manager is a no-op when the host process (or a
		// previous SDK instance) already installed one, and that existing manager
		// keeps working — so it is never torn down on shutdown.
		otelContext.setGlobalContextManager(
			new AsyncLocalStorageContextManager().enable(),
		);

		const endpoint =
			options.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

		if (options.traces !== false) {
			const processors: SpanProcessor[] = [...(options.spanProcessors ?? [])];
			if (endpoint) {
				processors.push(
					new BatchSpanProcessor(
						new OTLPTraceExporter({ url: `${trimSlash(endpoint)}/v1/traces` }),
					),
				);
			}
			if (options.console) {
				processors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
			}
			this.tracerProvider = new BasicTracerProvider({
				resource,
				spanProcessors: processors,
			});
			if (!otelTrace.setGlobalTracerProvider(this.tracerProvider)) {
				// A previous SDK instance still owns the global slot; the API refuses
				// to overwrite it, so reclaim it here instead of at shutdown.
				otelTrace.disable();
				otelTrace.setGlobalTracerProvider(this.tracerProvider);
			}
		}

		if (options.metrics !== false) {
			const interval = options.metricIntervalMillis ?? 60_000;
			const readers: MetricReader[] = [...(options.metricReaders ?? [])];
			if (endpoint) {
				readers.push(
					new PeriodicExportingMetricReader({
						exporter: new OTLPMetricExporter({
							url: `${trimSlash(endpoint)}/v1/metrics`,
						}),
						exportIntervalMillis: interval,
					}),
				);
			}
			if (options.console) {
				readers.push(
					new PeriodicExportingMetricReader({
						exporter: new ConsoleMetricExporter(),
						exportIntervalMillis: interval,
					}),
				);
			}
			if (readers.length > 0) {
				this.meterProvider = new MeterProvider({ resource, readers });
				if (!otelMetrics.setGlobalMeterProvider(this.meterProvider)) {
					otelMetrics.disable();
					otelMetrics.setGlobalMeterProvider(this.meterProvider);
				}
			}
		}
	}

	async shutdown(): Promise<void> {
		if (!this.started) return;
		this.started = false;
		// Only this SDK's own providers are flushed and stopped. The API-level
		// globals are left in place: they may be owned by the host process, and
		// disabling them permanently unbinds anything already holding a handle.
		await this.tracerProvider?.forceFlush();
		await this.tracerProvider?.shutdown();
		await this.meterProvider?.forceFlush();
		await this.meterProvider?.shutdown();
		this.tracerProvider = undefined;
		this.meterProvider = undefined;
	}
}

function trimSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}
