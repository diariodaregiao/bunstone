# Observability (OpenTelemetry)

Bunstone has built-in OpenTelemetry instrumentation. Register `TelemetryModule` and every HTTP request is automatically traced and measured — no manual instrumentation needed. When the module is not registered, instrumentation is a no-op with near-zero overhead.

## Setup

Import `TelemetryModule.register(...)` in your root module. Add it first so the SDK is ready before any request is handled.

```ts
import { Module, TelemetryModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    TelemetryModule.register({
      serviceName: "orders-api",
      serviceVersion: "1.2.0",
      environment: "production",
      otlpEndpoint: "http://localhost:4318",
    }),
  ],
})
export class AppModule {}
```

Start the app as usual — telemetry begins immediately.

## What gets instrumented

### Spans

- **HTTP** — `{METHOD} {route}` (e.g. `GET /users/:id`) with `http.request.method`, `http.route` and `http.response.status_code`. Responses `>= 500` are marked as errors.
- **Queue** — `process {queue}` with `messaging.system`, `messaging.destination.name` and `messaging.attempt`. A handler that throws marks the span as an error.
- **Database** — one span per `SqlService` operation, named after the statement's verb (`SELECT`, `INSERT`, `TRANSACTION`), with `db.operation.name` and `db.query.text`. Statements are parameterised, so the recorded text contains no values.
- **CQRS** — `command CreateUser`, `query GetUser`, `event UserCreated`, with `cqrs.kind` and `cqrs.message`.

These nest under the request that caused them, so a trace shows where the time actually went:

```
GET /orders/:id
├── query GetOrder
│   └── SELECT
└── SELECT
```

### Metrics

| Metric | Type | Attributes |
|---|---|---|
| `http.server.request.duration` | histogram (ms) | `http.request.method`, `http.route` |
| `http.server.requests` | counter | `http.request.method`, `http.route`, `http.response.status_class` |
| `http.server.active_requests` | up/down counter | `http.route` |
| `messaging.consumed.messages` | counter | `queue`, `outcome` (`ok` / `error`) |
| `messaging.published.messages` | counter | `target`, `outcome` (`ok` / `unroutable` / `error`) |
| `messaging.retried.messages` | counter | `queue` |
| `messaging.dead_lettered.messages` | counter | `queue` |
| `messaging.circuit_breaker.state` | gauge | `queue` — 0 closed, 1 half-open, 2 open |
| `messaging.consumer.paused` | gauge | `queue` — 1 while paused |
| `messaging.consumer.in_flight` | gauge | `queue` |
| `db.client.operation.duration` | histogram (ms) | `db.operation.name`, `outcome` |
| `cache.operations` | counter | `operation`, `result` (`hit` / `miss`) |
| `cqrs.handler.duration` | histogram (ms) | `cqrs.kind`, `cqrs.message`, `outcome` |

Status is recorded as a **class** (`2xx`, `4xx`, `5xx`) rather than an exact code, and routes are recorded as templates, so label cardinality stays bounded however many distinct URLs you serve.

The gauges are observable: consumers report their own state only when a collector asks, so nothing is computed while no backend is listening.

These cover the questions you usually reach for first: error rate per route (`http.server.requests` split by `status_class`), whether a queue is being retried into the ground (`messaging.retried` vs `messaging.dead_lettered`), and whether a consumer has stopped because its circuit opened (`messaging.circuit_breaker.state` with `messaging.consumer.paused`).

## Distributed tracing

Bunstone reads the W3C `traceparent` header on incoming requests, so a call from another service **continues that trace** instead of starting a new one. The same context is written into every message published to RabbitMQ and read back by the consumer.

The practical effect is a single trace across a hop that is usually invisible:

```
POST /orders                    (service A, span kind SERVER)
└── process orders.created      (service B, span kind CONSUMER)
```

Nothing to configure — registering `TelemetryModule` installs the W3C propagator.

To continue the trace into a service Bunstone does not call for you (an outbound `fetch`, a third-party SDK), inject the context into your own carrier:

```ts
import { injectTraceContext } from "@grupodiariodaregiao/bunstone";

const headers: Record<string, string> = {};
injectTraceContext(headers);           // adds `traceparent` when a span is active
await fetch(url, { headers });
```

## Everything here is optional

Instrumentation is inert until `TelemetryModule` is registered. Without it there is no exporter, no span and no measurable cost — extraction and injection resolve to the OpenTelemetry no-op implementations (about 0.1 ns per call), and a request carrying a `traceparent` is served exactly as any other. An application that wants nothing to do with tracing simply does not import the module.

## Options

```ts
interface TelemetryOptions {
  serviceName: string;            // required, attached to all traces and metrics
  serviceVersion?: string;        // default "0.0.0"
  environment?: string;           // default "development"
  otlpEndpoint?: string;          // OTLP HTTP base URL; falls back to OTEL_EXPORTER_OTLP_ENDPOINT
  traces?: boolean;               // default true
  metrics?: boolean;              // default true
  console?: boolean;              // also print spans/metrics to stdout, default false
  metricIntervalMillis?: number;  // metric export interval, default 60000
}
```

Traces are exported to `{otlpEndpoint}/v1/traces` and metrics to `{otlpEndpoint}/v1/metrics`. If `otlpEndpoint` is omitted, Bunstone reads the standard `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Exporting to a backend

The OTLP HTTP exporter works with any OTLP-compatible backend — Jaeger, Grafana Tempo/LGTM, or any OpenTelemetry Collector.

The quickest local stack is the free `grafana/otel-lgtm` image, which bundles Loki, Grafana, Tempo, and Prometheus with an OTLP endpoint on port 4318:

```bash
docker run -p 3000:3000 -p 4318:4318 grafana/otel-lgtm
```

```ts
TelemetryModule.register({
  serviceName: "orders-api",
  otlpEndpoint: "http://localhost:4318",
})
```

Open Grafana at http://localhost:3000 to explore the traces and metrics.

## Local console output

For quick local debugging without a backend, print spans and metrics to stdout:

```ts
TelemetryModule.register({
  serviceName: "orders-api",
  console: true,
  metricIntervalMillis: 10_000,
})
```

## Direct access

`TelemetryService` is injectable, and the resolved configuration is registered under the `TELEMETRY_OPTIONS` token. `TelemetrySdk` is the lower-level object that owns the tracer and meter providers, if you need to reach them.

## Log correlation

The built-in `Logger` automatically includes `trace_id` and `span_id` whenever a span is active for the current request, so log lines can be correlated with their trace in your backend. No configuration is required — it works as soon as `TelemetryModule` is registered.

## Shutdown

`TelemetryModule` registers an `onModuleDestroy` hook that flushes all pending spans and metrics when the application closes, so nothing is lost on graceful shutdown.

Only the SDK's own providers are shut down, and the process-wide OpenTelemetry slots are released so the next application can claim them. A process that creates a second `Application` after closing the first (integration test suites, hot-reload supervisors) keeps exporting normally.

**One telemetry-enabled application per process.** OpenTelemetry's tracer and meter providers are process globals. If a second application starts telemetry while a first still owns them, the second logs a warning and does not export — it will not seize the slots and silence the application that is already running. Run one at a time, or enable `TelemetryModule` in only one of them.
