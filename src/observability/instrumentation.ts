import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("bunstone.http");
const meter = metrics.getMeter("bunstone.http");

const requestDuration = meter.createHistogram("http.server.request.duration", {
	unit: "ms",
	description: "Duration of inbound HTTP requests.",
});

export function instrumentRequest(
	method: string,
	route: string,
	handle: () => Promise<Response>,
): Promise<Response> {
	const start = performance.now();
	return tracer.startActiveSpan(`${method} ${route}`, async (span) => {
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
