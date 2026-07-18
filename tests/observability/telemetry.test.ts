import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { TelemetryModule } from "@/observability/telemetry-module";

const exporter = new InMemorySpanExporter();

@Controller("ping")
class PingController {
	@Get()
	ping() {
		return { ok: true };
	}

	@Get("fail")
	fail() {
		throw new Error("boom");
	}
}

@Module({
	imports: [
		TelemetryModule.register({
			serviceName: "test-api",
			metrics: false,
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		}),
	],
	controllers: [PingController],
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

describe("HTTP telemetry", () => {
	it("emits a span per request with route and status", async () => {
		exporter.reset();
		await fetch(`${base}/ping`);

		const spans = exporter.getFinishedSpans();
		expect(spans).toHaveLength(1);
		expect(spans[0]?.name).toBe("GET /ping");
		expect(spans[0]?.attributes["http.route"]).toBe("/ping");
		expect(spans[0]?.attributes["http.response.status_code"]).toBe(200);
	});

	it("marks 5xx responses as error spans", async () => {
		exporter.reset();
		const originalLog = console.log;
		console.log = () => {};
		const res = await fetch(`${base}/ping/fail`);
		console.log = originalLog;
		expect(res.status).toBe(500);

		const span = exporter.getFinishedSpans()[0];
		expect(span?.attributes["http.response.status_code"]).toBe(500);
		expect(span?.status.code).toBe(2);
	});
});
