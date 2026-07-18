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
			otelTrace.setGlobalTracerProvider(this.tracerProvider);
		}

		if (options.metrics !== false) {
			const interval = options.metricIntervalMillis ?? 60_000;
			const readers: PeriodicExportingMetricReader[] = [];
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
				otelMetrics.setGlobalMeterProvider(this.meterProvider);
			}
		}
	}

	async shutdown(): Promise<void> {
		if (!this.started) return;
		this.started = false;
		await this.tracerProvider?.shutdown();
		await this.meterProvider?.shutdown();
		otelTrace.disable();
		otelMetrics.disable();
		otelContext.disable();
		this.tracerProvider = undefined;
		this.meterProvider = undefined;
	}
}

function trimSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}
