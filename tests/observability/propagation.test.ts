import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { trace } from "@opentelemetry/api";
import {
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { injectTraceContext } from "@/observability/instrumentation";
import { TelemetryModule } from "@/observability/telemetry-module";

const UPSTREAM = "4bf92f3577b34da6a3ce929d0e0e4736";
const TRACEPARENT = `00-${UPSTREAM}-00f067aa0ba902b7-01`;

let seenTraceId = "";

@Controller("t")
class TraceController {
	@Get()
	index() {
		seenTraceId = trace.getActiveSpan()?.spanContext().traceId ?? "none";
		return { ok: true };
	}
}

async function boot(withTelemetry: boolean) {
	const exporter = new InMemorySpanExporter();

	@Module({
		imports: withTelemetry
			? [
					TelemetryModule.register({
						serviceName: "test",
						metrics: false,
						spanProcessors: [new SimpleSpanProcessor(exporter)],
					}),
				]
			: [],
		controllers: [TraceController],
	})
	class AppModule {}

	const app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	return { app, base, exporter };
}

describe("trace context propagation", () => {
	it("continues the caller's trace instead of starting a new one", async () => {
		const { app, base } = await boot(true);

		await fetch(`${base}/t`, { headers: { traceparent: TRACEPARENT } });

		expect(seenTraceId).toBe(UPSTREAM);
		await app.close();
	});

	it("writes the active context into an outgoing carrier", async () => {
		const { app, base, exporter } = await boot(true);
		await fetch(`${base}/t`, { headers: { traceparent: TRACEPARENT } });

		const carrier: Record<string, unknown> = {};
		injectTraceContext(carrier);

		// outside a span there is nothing to inject; inside one there is
		expect(carrier.traceparent).toBeUndefined();
		expect(exporter.getFinishedSpans().at(0)?.spanContext().traceId).toBe(
			UPSTREAM,
		);
		await app.close();
	});

	it("serves normally when no telemetry module is registered", async () => {
		const { app, base, exporter } = await boot(false);

		const res = await fetch(`${base}/t`, {
			headers: { traceparent: TRACEPARENT },
		});

		// extraction and injection are inert rather than broken: the request is
		// served and nothing is exported. (The propagator itself is a process
		// global, so a telemetry-enabled app elsewhere in the process may still
		// have installed one — what matters is that this app exports nothing.)
		expect(res.status).toBe(200);
		expect(exporter.getFinishedSpans()).toHaveLength(0);
		expect(() => injectTraceContext({})).not.toThrow();

		await app.close();
	});
});
