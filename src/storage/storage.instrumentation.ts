import {
	context,
	type Histogram,
	type MeterProvider,
	metrics,
	SpanKind,
	SpanStatusCode,
	type Tracer,
	type TracerProvider,
	trace,
} from "@opentelemetry/api";

// Kept out of src/observability so an app without storage does not carry it.
// Like the core instruments, both handles are resolved on first use and again
// whenever the global provider changes (a new TelemetrySdk after a shutdown).
let tracerProvider: TracerProvider | undefined;
let tracer: Tracer | undefined;
let meterProvider: MeterProvider | undefined;
let duration: Histogram | undefined;

function getTracer(): Tracer {
	const provider = trace.getTracerProvider();
	if (!tracer || provider !== tracerProvider) {
		tracerProvider = provider;
		tracer = provider.getTracer("bunstone.storage");
	}
	return tracer;
}

function getDuration(): Histogram {
	const provider = metrics.getMeterProvider();
	if (!duration || provider !== meterProvider) {
		meterProvider = provider;
		duration = provider
			.getMeter("bunstone")
			.createHistogram("storage.operation.duration", {
				unit: "ms",
				description: "Duration of object-storage operations.",
			});
	}
	return duration;
}

/**
 * One object-storage call, as `storage write`. The key is recorded on the
 * span but not on the metric, so label cardinality stays bounded.
 */
export function instrumentStorage<T>(
	operation: string,
	bucket: string | undefined,
	key: string | undefined,
	run: () => Promise<T>,
): Promise<T> {
	const start = performance.now();
	let outcome = "ok";

	return getTracer().startActiveSpan(
		`storage ${operation}`,
		{ kind: SpanKind.CLIENT },
		context.active(),
		async (span) => {
			span.setAttribute("storage.operation.name", operation);
			if (bucket) span.setAttribute("storage.bucket", bucket);
			if (key !== undefined) span.setAttribute("storage.key", key);
			try {
				return await run();
			} catch (error) {
				outcome = "error";
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				throw error;
			} finally {
				getDuration().record(performance.now() - start, {
					"storage.operation.name": operation,
					outcome,
				});
				span.end();
			}
		},
	);
}
