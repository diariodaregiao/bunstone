import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
	AggregationTemporality,
	InMemoryMetricExporter,
	PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { InternalServerErrorException } from "@/http/exceptions";
import { Controller, Get } from "@/http/routing";
import {
	type ConsumerState,
	registerConsumerState,
	unregisterConsumerState,
} from "@/observability/metrics";
import { TelemetryModule } from "@/observability/telemetry-module";

@Controller("t")
class MetricsController {
	@Get("ok")
	ok() {
		return { ok: true };
	}

	@Get("boom")
	boom(): never {
		throw new InternalServerErrorException("nope");
	}
}

const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
const reader = new PeriodicExportingMetricReader({
	exporter,
	exportIntervalMillis: 600_000,
});

@Module({
	imports: [
		TelemetryModule.register({
			serviceName: "metrics-test",
			traces: false,
			metricReaders: [reader],
		}),
	],
	controllers: [MetricsController],
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

interface Point {
	attributes: Record<string, unknown>;
	value: number;
}

async function pointsFor(name: string): Promise<Point[]> {
	const { resourceMetrics } = await reader.collect();
	for (const scope of resourceMetrics.scopeMetrics) {
		for (const metric of scope.metrics) {
			if (metric.descriptor.name === name) {
				return metric.dataPoints as unknown as Point[];
			}
		}
	}
	return [];
}

describe("HTTP metrics", () => {
	it("counts requests by route and status class", async () => {
		await fetch(`${base}/t/ok`);
		await fetch(`${base}/t/ok`);
		await fetch(`${base}/t/boom`);

		const points = await pointsFor("http.server.requests");
		const successes = points.find(
			(point) =>
				point.attributes["http.route"] === "/t/ok" &&
				point.attributes["http.response.status_class"] === "2xx",
		);
		const failures = points.find(
			(point) =>
				point.attributes["http.route"] === "/t/boom" &&
				point.attributes["http.response.status_class"] === "5xx",
		);

		expect(successes?.value).toBe(2);
		expect(failures?.value).toBe(1);
	});

	it("returns the in-flight gauge to zero once requests finish", async () => {
		await fetch(`${base}/t/ok`);

		const points = await pointsFor("http.server.active_requests");
		expect(points.every((point) => point.value === 0)).toBe(true);
	});
});

describe("consumer state gauges", () => {
	it("reports what a registered consumer says about itself", async () => {
		const state: ConsumerState = { circuit: 2, paused: true, inFlight: 3 };
		registerConsumerState("orders", () => state);

		try {
			const circuit = await pointsFor("messaging.circuit_breaker.state");
			const paused = await pointsFor("messaging.consumer.paused");
			const inFlight = await pointsFor("messaging.consumer.in_flight");

			expect(circuit.find((p) => p.attributes.queue === "orders")?.value).toBe(
				2,
			);
			expect(paused.find((p) => p.attributes.queue === "orders")?.value).toBe(
				1,
			);
			expect(inFlight.find((p) => p.attributes.queue === "orders")?.value).toBe(
				3,
			);
		} finally {
			unregisterConsumerState("orders");
		}
	});

	it("stops reporting a consumer that unregistered", async () => {
		registerConsumerState("gone", () => ({
			circuit: 0,
			paused: false,
			inFlight: 0,
		}));
		unregisterConsumerState("gone");

		const points = await pointsFor("messaging.consumer.paused");
		expect(points.some((point) => point.attributes.queue === "gone")).toBe(
			false,
		);
	});
});
