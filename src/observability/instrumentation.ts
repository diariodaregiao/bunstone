import {
	type Histogram,
	type MeterProvider,
	metrics,
	SpanStatusCode,
	type Tracer,
	type TracerProvider,
	trace,
} from "@opentelemetry/api";

const INSTRUMENTATION_NAME = "bunstone.http";

// The metrics API resolves the global provider eagerly, so an instrument created
// at import time stays a no-op forever. Both handles are therefore resolved on
// first use and re-resolved whenever the global provider identity changes, which
// is what happens when a new TelemetrySdk claims the slot after a shutdown.
let tracerProvider: TracerProvider | undefined;
let cachedTracer: Tracer | undefined;
let meterProvider: MeterProvider | undefined;
let cachedRequestDuration: Histogram | undefined;

function getTracer(): Tracer {
	const provider = trace.getTracerProvider();
	if (!cachedTracer || provider !== tracerProvider) {
		tracerProvider = provider;
		cachedTracer = provider.getTracer(INSTRUMENTATION_NAME);
	}
	return cachedTracer;
}

function getRequestDuration(): Histogram {
	const provider = metrics.getMeterProvider();
	if (!cachedRequestDuration || provider !== meterProvider) {
		meterProvider = provider;
		cachedRequestDuration = provider
			.getMeter(INSTRUMENTATION_NAME)
			.createHistogram("http.server.request.duration", {
				unit: "ms",
				description: "Duration of inbound HTTP requests.",
			});
	}
	return cachedRequestDuration;
}

export function instrumentRequest(
	method: string,
	route: string,
	handle: () => Promise<Response>,
): Promise<Response> {
	const start = performance.now();
	const requestDuration = getRequestDuration();
	return getTracer().startActiveSpan(`${method} ${route}`, async (span) => {
		span.setAttribute("http.request.method", method);
		span.setAttribute("http.route", route);
		try {
			const response = await handle();
			span.setAttribute("http.response.status_code", response.status);
			if (response.status >= 500) {
				span.setStatus({ code: SpanStatusCode.ERROR });
			}
			return response;
		} finally {
			requestDuration.record(performance.now() - start, {
				"http.request.method": method,
				"http.route": route,
			});
			span.end();
		}
	});
}
