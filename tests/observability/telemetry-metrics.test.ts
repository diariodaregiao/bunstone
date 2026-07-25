import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
	InMemoryMetricExporter,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { TelemetryModule } from "@/observability/telemetry-module";

// A long interval keeps the periodic export from firing; the test pulls the
// metrics itself with an explicit collect().
const reader = new PeriodicExportingMetricReader({
	exporter: new InMemoryMetricExporter(0),
	exportIntervalMillis: 600_000,
});

@Controller("metrics-ping")
class MetricsPingController {
	@Get()
	ping() {
		return { ok: true };
	}
}

@Module({
	imports: [
		TelemetryModule.register({
			serviceName: "metrics-api",
			traces: false,
			metricReaders: [reader],
		}),
	],
	controllers: [MetricsPingController],
})
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("HTTP metrics", () => {
	it("records the request duration histogram", async () => {
		await fetch(`${base}/metrics-ping`);

		const collected = await reader.collect();
		const metric = collected.resourceMetrics.scopeMetrics
			.flatMap((scope) => scope.metrics)
			.find(
				(candidate) =>
					candidate.descriptor.name === "http.server.request.duration",
			);

		expect(metric).toBeDefined();
		expect(metric?.descriptor.unit).toBe("ms");

		const point = metric?.dataPoints.find(
			(candidate) => candidate.attributes["http.route"] === "/metrics-ping",
		);
		expect(point).toBeDefined();
		expect((point?.value as { count: number }).count).toBeGreaterThanOrEqual(1);
		expect(point?.attributes["http.request.method"]).toBe("GET");
	});
});
