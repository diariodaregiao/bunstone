import {
	type Attributes,
	type Counter,
	type Histogram,
	type Meter,
	type MeterProvider,
	metrics,
	type UpDownCounter,
} from "@opentelemetry/api";

const METER_NAME = "bunstone";

/** What a consumer reports about itself when metrics are collected. */
export interface ConsumerState {
	/** 0 closed, 1 half-open, 2 open. */
	circuit: number;
	paused: boolean;
	inFlight: number;
}

interface Instruments {
	requestDuration: Histogram;
	requests: Counter;
	activeRequests: UpDownCounter;
	consumed: Counter;
	published: Counter;
	retried: Counter;
	deadLettered: Counter;
	dbDuration: Histogram;
	cacheOperations: Counter;
	cqrsDuration: Histogram;
}

const consumerStates = new Map<string, () => ConsumerState>();

/**
 * Consumers report their own state; the gauges read this registry when the
 * collector asks, so nothing is computed while no backend is listening.
 */
export function registerConsumerState(
	queue: string,
	read: () => ConsumerState,
): void {
	consumerStates.set(queue, read);
}

export function unregisterConsumerState(queue: string): void {
	consumerStates.delete(queue);
}

let provider: MeterProvider | undefined;
let instruments: Instruments | undefined;

/**
 * Instruments are resolved on first use and re-resolved whenever the global
 * provider changes: the metrics API resolves eagerly, so anything created at
 * import time would stay a no-op for the life of the process.
 */
export function getInstruments(): Instruments {
	const current = metrics.getMeterProvider();
	if (instruments && current === provider) return instruments;

	provider = current;
	const meter = current.getMeter(METER_NAME);
	instruments = {
		requestDuration: meter.createHistogram("http.server.request.duration", {
			unit: "ms",
			description: "Duration of inbound HTTP requests.",
		}),
		requests: meter.createCounter("http.server.requests", {
			description: "Inbound HTTP requests by route and status class.",
		}),
		activeRequests: meter.createUpDownCounter("http.server.active_requests", {
			description: "HTTP requests currently being handled.",
		}),
		consumed: meter.createCounter("messaging.consumed.messages", {
			description: "Messages handled by a queue consumer.",
		}),
		published: meter.createCounter("messaging.published.messages", {
			description: "Messages published, by outcome.",
		}),
		retried: meter.createCounter("messaging.retried.messages", {
			description: "Messages moved to a retry queue.",
		}),
		deadLettered: meter.createCounter("messaging.dead_lettered.messages", {
			description: "Messages moved to a dead-letter queue.",
		}),
		dbDuration: meter.createHistogram("db.client.operation.duration", {
			unit: "ms",
			description: "Duration of database operations.",
		}),
		cacheOperations: meter.createCounter("cache.operations", {
			description: "Cache operations by kind and result.",
		}),
		cqrsDuration: meter.createHistogram("cqrs.handler.duration", {
			unit: "ms",
			description: "Duration of command, query and event handlers.",
		}),
	};
	registerConsumerGauges(meter);
	return instruments;
}

function registerConsumerGauges(meter: Meter): void {
	const circuit = meter.createObservableGauge(
		"messaging.circuit_breaker.state",
		{
			description:
				"Circuit breaker state per queue: 0 closed, 1 half-open, 2 open.",
		},
	);
	const paused = meter.createObservableGauge("messaging.consumer.paused", {
		description: "1 while a consumer is paused, 0 while it is consuming.",
	});
	const inFlight = meter.createObservableGauge("messaging.consumer.in_flight", {
		description: "Messages currently being handled by a consumer.",
	});

	meter.addBatchObservableCallback(
		(result) => {
			for (const [queue, read] of consumerStates) {
				const state = read();
				const attributes: Attributes = { queue };
				result.observe(circuit, state.circuit, attributes);
				result.observe(paused, state.paused ? 1 : 0, attributes);
				result.observe(inFlight, state.inFlight, attributes);
			}
		},
		[circuit, paused, inFlight],
	);
}
