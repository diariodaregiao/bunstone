/**
 * OTLP HTTP exporter options for traces or metrics.
 */
export interface OtlpExporterOptions {
	/**
	 * Base OTLP endpoint URL.
	 * Traces are exported to {endpoint}/v1/traces
	 * Metrics are exported to {endpoint}/v1/metrics
	 * Overrides OTEL_EXPORTER_OTLP_ENDPOINT env var.
	 * Default: "http://localhost:4318"
	 */
	endpoint?: string;
	/** Extra HTTP headers to include in every OTLP request */
	headers?: Record<string, string>;
}

/**
 * Full configuration for Bunstone's built-in OpenTelemetry integration.
 *
 * @example
 * ```typescript
 * TelemetryModule.register({
 *   serviceName: "my-api",
 *   serviceVersion: "1.2.3",
 *   environment: "production",
 *   traces: { otlp: { endpoint: "http://otel-collector:4318" } },
 *   metrics: { exportIntervalMillis: 30_000 },
 * })
 * ```
 */
export interface TelemetryOptions {
	/** Service name included in all traces and metrics */
	serviceName: string;
	/** Service version (default: "unknown") */
	serviceVersion?: string;
	/** Deployment environment, e.g. "production" or "staging" (default: "production") */
	environment?: string;

	/** Distributed tracing configuration */
	traces?: {
		/** Enable tracing. Default: true */
		enabled?: boolean;
		/** OTLP HTTP exporter options */
		otlp?: OtlpExporterOptions;
		/**
		 * Sampling ratio (0.0 – 1.0).
		 * 1.0 = record every span (default).
		 * 0.1 = record 10 % of traces.
		 */
		sampleRatio?: number;
	};

	/** Metrics configuration */
	metrics?: {
		/** Enable metrics. Default: true */
		enabled?: boolean;
		/** OTLP HTTP exporter options */
		otlp?: OtlpExporterOptions;
		/**
		 * How often metrics are pushed to the exporter in milliseconds.
		 * Default: 60_000 (1 minute)
		 */
		exportIntervalMillis?: number;
	};

	/**
	 * Also print spans and metrics to stdout.
	 * Useful in local development or CI.
	 * Default: false
	 */
	consoleExport?: boolean;
}
