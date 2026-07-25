import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import {
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { TelemetryModule } from "@/observability/telemetry-module";

@Controller("restart")
class RestartController {
	@Get()
	ping() {
		return { ok: true };
	}
}

function moduleWith(exporter: InMemorySpanExporter) {
	@Module({
		imports: [
			TelemetryModule.register({
				serviceName: "restart-api",
				metrics: false,
				spanProcessors: [new SimpleSpanProcessor(exporter)],
			}),
		],
		controllers: [RestartController],
	})
	class AppModule {}

	return AppModule;
}

// `InMemorySpanExporter.shutdown()` drops everything it collected, so the spans
// have to be read before the application is closed.
async function bootAndCall(exporter: InMemorySpanExporter): Promise<string[]> {
	const app = await Application.create(moduleWith(exporter), {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	await fetch(`${base}/restart`);
	const names = exporter.getFinishedSpans().map((span) => span.name);
	await app.close();
	return names;
}

describe("telemetry across application restarts", () => {
	it("still exports spans from a second application in the same process", async () => {
		expect(await bootAndCall(new InMemorySpanExporter())).toEqual([
			"GET /restart",
		]);
		expect(await bootAndCall(new InMemorySpanExporter())).toEqual([
			"GET /restart",
		]);
	});
});
