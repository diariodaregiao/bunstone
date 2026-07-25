import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
	AggregationTemporality,
	InMemoryMetricExporter,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { CommandBus } from "@/cqrs/command-bus";
import { CqrsModule } from "@/cqrs/cqrs-module";
import { CommandHandler, QueryHandler } from "@/cqrs/decorators";
import { QueryBus } from "@/cqrs/query-bus";
import { Controller, Get } from "@/http/routing";
import {
	instrumentQuery,
	recordCacheResult,
} from "@/observability/instrumentation";
import { TelemetryModule } from "@/observability/telemetry-module";

class Ping {
	constructor(readonly n: number) {}
}

class Pong {
	constructor(readonly n: number) {}
}

@CommandHandler(Ping)
@Injectable()
class PingHandler {
	async execute(command: Ping) {
		return command.n;
	}
}

@QueryHandler(Pong)
@Injectable()
class PongHandler {
	async execute(query: Pong) {
		return query.n;
	}
}

@Controller("w")
@Injectable()
class WorkController {
	constructor(
		private readonly commands: CommandBus,
		private readonly queries: QueryBus,
	) {}

	@Get()
	async go() {
		// a fake driver call: the point is the instrumentation, not the database
		await instrumentQuery("SELECT", "SELECT 1", async () => [{ one: 1 }]);
		recordCacheResult("get", "miss");
		recordCacheResult("get", "hit");
		await this.commands.execute(new Ping(1));
		await this.queries.execute(new Pong(2));
		return { ok: true };
	}
}

const spans = new InMemorySpanExporter();
const metricExporter = new InMemoryMetricExporter(
	AggregationTemporality.CUMULATIVE,
);
const reader = new PeriodicExportingMetricReader({
	exporter: metricExporter,
	exportIntervalMillis: 600_000,
});

@Module({
	imports: [
		TelemetryModule.register({
			serviceName: "coverage",
			spanProcessors: [new SimpleSpanProcessor(spans)],
			metricReaders: [reader],
		}),
		CqrsModule.register(),
	],
	controllers: [WorkController],
	providers: [PingHandler, PongHandler],
})
class AppModule {}

let app: Application;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	await fetch(`${base}/w`);
});

afterAll(async () => {
	await app.close();
});

describe("instrumentation coverage", () => {
	it("produces a span for the query, the command and the query bus", () => {
		const names = spans.getFinishedSpans().map((span) => span.name);

		expect(names).toContain("SELECT");
		expect(names).toContain("command Ping");
		expect(names).toContain("query Pong");
		expect(names).toContain("GET /w");
	});

	it("nests them under the request span, in one trace", () => {
		const finished = spans.getFinishedSpans();
		const request = finished.find((span) => span.name === "GET /w");
		const inner = finished.filter((span) => span.name !== "GET /w");

		expect(request).toBeDefined();
		for (const span of inner) {
			expect(span.spanContext().traceId).toBe(
				request?.spanContext().traceId ?? "",
			);
			expect(span.parentSpanContext?.spanId).toBe(
				request?.spanContext().spanId,
			);
		}
	});

	it("records database, cache and handler metrics", async () => {
		const { resourceMetrics } = await reader.collect();
		const names = resourceMetrics.scopeMetrics.flatMap((scope) =>
			scope.metrics.map((metric) => metric.descriptor.name),
		);

		expect(names).toContain("db.client.operation.duration");
		expect(names).toContain("cache.operations");
		expect(names).toContain("cqrs.handler.duration");
	});

	it("separates cache hits from misses", async () => {
		const { resourceMetrics } = await reader.collect();
		const cache = resourceMetrics.scopeMetrics
			.flatMap((scope) => scope.metrics)
			.find((metric) => metric.descriptor.name === "cache.operations");

		const points = (cache?.dataPoints ?? []) as unknown as {
			attributes: Record<string, unknown>;
			value: number;
		}[];

		expect(points.find((p) => p.attributes.result === "hit")?.value).toBe(1);
		expect(points.find((p) => p.attributes.result === "miss")?.value).toBe(1);
	});
});
