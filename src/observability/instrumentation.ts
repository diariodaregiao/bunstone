import {
	type Context,
	type Counter,
	context,
	type Histogram,
	type MeterProvider,
	metrics,
	propagation,
	SpanKind,
	SpanStatusCode,
	type TextMapGetter,
	type TextMapSetter,
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
let cachedConsumed: Counter | undefined;

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

function getConsumedCounter(): Counter {
	const provider = metrics.getMeterProvider();
	if (!cachedConsumed || provider !== meterProvider) {
		meterProvider = provider;
		cachedConsumed = provider
			.getMeter(INSTRUMENTATION_NAME)
			.createCounter("messaging.consumed.messages", {
				description: "Messages handled by a queue consumer.",
			});
	}
	return cachedConsumed;
}

const headersGetter: TextMapGetter<Headers> = {
	keys: (carrier) => [...carrier.keys()],
	get: (carrier, key) => carrier.get(key) ?? undefined,
};

const recordGetter: TextMapGetter<Record<string, unknown>> = {
	keys: (carrier) => Object.keys(carrier),
	get: (carrier, key) => {
		const value = carrier[key];
		return typeof value === "string" ? value : undefined;
	},
};

const recordSetter: TextMapSetter<Record<string, unknown>> = {
	set: (carrier, key, value) => {
		carrier[key] = value;
	},
};

/**
 * Writes the active trace context into a carrier so the next hop can continue
 * the same trace. A no-op when no propagator is registered.
 */
export function injectTraceContext(carrier: Record<string, unknown>): void {
	propagation.inject(context.active(), carrier, recordSetter);
}

export function instrumentRequest(
	method: string,
	route: string,
	handle: () => Promise<Response>,
	headers?: Headers,
): Promise<Response> {
	const start = performance.now();
	const requestDuration = getRequestDuration();
	// continue the caller's trace when it sent one, instead of starting a new
	// root span and severing the request from the service that made it
	const parent: Context = headers
		? propagation.extract(context.active(), headers, headersGetter)
		: context.active();

	return getTracer().startActiveSpan(
		`${method} ${route}`,
		{ kind: SpanKind.SERVER },
		parent,
		async (span) => {
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
		},
	);
}

/**
 * Wraps a queue handler in a span that continues the trace of whoever
 * published the message, so an HTTP request and the consumer it triggered
 * appear in one trace instead of two unrelated ones.
 */
export function instrumentConsume<T>(
	queue: string,
	attempt: number,
	headers: Record<string, unknown> | undefined,
	handle: () => Promise<T>,
): Promise<T> {
	const consumed = getConsumedCounter();
	const parent = headers
		? propagation.extract(context.active(), headers, recordGetter)
		: context.active();

	return getTracer().startActiveSpan(
		`process ${queue}`,
		{ kind: SpanKind.CONSUMER },
		parent,
		async (span) => {
			span.setAttribute("messaging.system", "rabbitmq");
			span.setAttribute("messaging.destination.name", queue);
			span.setAttribute("messaging.attempt", attempt);
			try {
				const result = await handle();
				consumed.add(1, { queue, outcome: "ok" });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				consumed.add(1, { queue, outcome: "error" });
				throw error;
			} finally {
				span.end();
			}
		},
	);
}
