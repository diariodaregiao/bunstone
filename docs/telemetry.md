# OpenTelemetry (Observability)

Bunstone has built-in OpenTelemetry instrumentation that automatically captures **traces** and **metrics** from all major application layers — no manual instrumentation required.

## What gets instrumented automatically

| Layer | Traces | Metrics |
|---|---|---|
| **HTTP** (Elysia routes) | ✅ Per-request spans with route, method, status | ✅ `http.server.request.duration`, `http.server.request.count` |
| **SQL** | ✅ Per-query spans with operation and sanitized SQL | ✅ `db.query.duration` |
| **CQRS — Commands** | ✅ Per-command spans | ✅ `cqrs.command.duration` |
| **CQRS — Queries** | ✅ Per-query spans | ✅ `cqrs.query.duration` |
| **CQRS — Events** | ✅ Per-publish spans | ✅ `cqrs.event.publish.count` |
| **RabbitMQ — publish** | ✅ Producer spans + W3C context injection | ✅ `messaging.rabbitmq.publish.duration` |
| **RabbitMQ — consume** | ✅ Consumer spans + W3C context extraction | ✅ `messaging.rabbitmq.consume.duration` |
| **BullMQ — process** | ✅ Per-job spans | ✅ `messaging.bullmq.process.duration` |

> **Context propagation is automatic.** Because every HTTP request runs inside an OTel `AsyncLocalStorage` context, SQL queries, CQRS commands, and message publishes that happen during a request are automatically nested as child spans of the HTTP span — no manual context passing needed.

## Quick start

### 1. Install (already included in Bunstone)

```bash
# OTel packages are bundled — nothing extra to install
```

### 2. Register `TelemetryModule`

Add it as the **first** import in your root module so the SDK is ready before any routes start handling requests.

```typescript
import { Module, TelemetryModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    TelemetryModule.register({
      serviceName: "orders-api",
      serviceVersion: "1.2.0",
      environment: process.env.NODE_ENV ?? "production",
      traces: {
        otlp: { endpoint: "http://otel-collector:4318" },
      },
      metrics: {
        otlp: { endpoint: "http://otel-collector:4318" },
        exportIntervalMillis: 30_000,
      },
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Start your app normally

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await AppStartup.create(AppModule);
app.listen(3000);
```

That's it. All instrumented layers will immediately start producing telemetry.

---

## Configuration reference

### `TelemetryOptions`

```typescript
interface TelemetryOptions {
  /** Service name included in all traces and metrics — required */
  serviceName: string;

  /** Semantic version string (default: "unknown") */
  serviceVersion?: string;

  /** Deployment environment, e.g. "production" (default: "production") */
  environment?: string;

  traces?: {
    /** Enable tracing. Default: true */
    enabled?: boolean;

    /** OTLP HTTP exporter options */
    otlp?: {
      /**
       * Base endpoint URL.
       * Traces are sent to {endpoint}/v1/traces.
       * Falls back to OTEL_EXPORTER_OTLP_ENDPOINT env var, then
       * "http://localhost:4318".
       */
      endpoint?: string;
      /** Extra HTTP headers for every OTLP request */
      headers?: Record<string, string>;
    };

    /**
     * Sampling ratio 0.0–1.0.
     * 1.0 = record every span (default).
     * 0.1 = record 10 % of root spans.
     */
    sampleRatio?: number;
  };

  metrics?: {
    /** Enable metrics. Default: true */
    enabled?: boolean;

    otlp?: {
      endpoint?: string;
      headers?: Record<string, string>;
    };

    /**
     * How often metrics are pushed to the exporter in milliseconds.
     * Default: 60_000 (1 minute).
     */
    exportIntervalMillis?: number;
  };

  /**
   * Also print spans and metrics to stdout.
   * Useful in local development. Default: false.
   */
  consoleExport?: boolean;
}
```

---

## Local development with console output

```typescript
TelemetryModule.register({
  serviceName: "my-api",
  consoleExport: true,    // prints spans to stdout
  traces: { enabled: true },
  metrics: { enabled: true, exportIntervalMillis: 10_000 },
})
```

---

## Connecting to a collector

Any OpenTelemetry-compatible collector works.

### Jaeger (all-in-one)

```bash
docker run -d \
  -p 4318:4318 \           # OTLP HTTP
  -p 16686:16686 \         # Jaeger UI
  jaegertracing/all-in-one:latest
```

```typescript
TelemetryModule.register({
  serviceName: "my-api",
  traces: { otlp: { endpoint: "http://localhost:4318" } },
})
```

Open <http://localhost:16686> to view traces.

### Grafana + Tempo + Prometheus

```typescript
TelemetryModule.register({
  serviceName: "my-api",
  traces: {
    otlp: { endpoint: "http://tempo:4318" },
  },
  metrics: {
    otlp: { endpoint: "http://otel-collector:4318" },
    exportIntervalMillis: 15_000,
  },
})
```

### Using environment variables

Instead of hardcoding the endpoint you can set:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

and omit `otlp.endpoint` from the config object.

---

## Distributed tracing across services

Bunstone follows the **W3C Trace Context** standard ([RFC](https://www.w3.org/TR/trace-context/)).

- **Incoming requests**: The `traceparent` / `tracestate` headers are automatically extracted and used as the parent context for all spans generated during that request.
- **Outgoing RabbitMQ messages**: The current trace context is automatically injected into message headers so consumers in other services can continue the same trace.

This means a single distributed trace can span your Bunstone service **and** any downstream service that understands W3C Trace Context.

---

## Span and metric names reference

### HTTP spans

| Attribute | Value |
|---|---|
| Span name | `{METHOD} {route}` — e.g. `GET /users/:id` |
| `http.request.method` | `GET`, `POST`, etc. |
| `http.route` | Parametrized route, e.g. `/users/:id` |
| `url.path` | Actual path, e.g. `/users/123` |
| `url.full` | Full URL |
| `http.response.status_code` | HTTP status code |
| Span status | `OK` for < 500, `ERROR` for ≥ 500 |

### SQL spans

| Attribute | Value |
|---|---|
| Span name | `db.{OPERATION}` — e.g. `db.SELECT` |
| `db.system` | `postgresql`, `mysql`, or `sqlite` |
| `db.operation.name` | SQL operation keyword |
| `db.query.text` | Sanitized SQL (parameter values replaced with `?`) |

### CQRS spans

| Attribute | Value |
|---|---|
| Span name | `command.execute {CommandName}` / `query.execute {QueryName}` / `event.publish {EventName}` |
| `cqrs.type` | `command`, `query`, or `event` |
| `cqrs.command.name` / `cqrs.query.name` / `cqrs.event.name` | Class name of the command/query/event |

### RabbitMQ spans

| Attribute | Value |
|---|---|
| Span name | `rabbitmq.publish {exchange}` or `rabbitmq.consume {queue}` |
| `messaging.system` | `rabbitmq` |
| `messaging.operation.type` | `publish` or `deliver` |
| `messaging.destination.name` | Exchange or queue name |
| `messaging.rabbitmq.destination.routing_key` | Routing key |

### BullMQ spans

| Attribute | Value |
|---|---|
| Span name | `bullmq.process {queue}/{jobName}` |
| `messaging.system` | `bullmq` |
| `messaging.operation.type` | `process` |
| `messaging.destination.name` | Queue name |
| `messaging.bullmq.job.name` | Job name |
| `messaging.bullmq.job.id` | Job ID |
| `messaging.bullmq.job.attempts` | Number of processing attempts |

---

## Advanced: bring your own SDK

`TelemetryModule` is optional. If you already have a custom `TracerProvider` and `MeterProvider` set up via `@opentelemetry/api`, Bunstone's instrumentation will automatically use them — because all instrumentation only calls the OTel API, which delegates to whatever provider is globally registered.

```typescript
import { trace, metrics } from "@opentelemetry/api";

// Set up your own providers before AppStartup.create()
trace.setGlobalTracerProvider(myTracerProvider);
metrics.setGlobalMeterProvider(myMeterProvider);

// Then start the app — no TelemetryModule needed
const app = await AppStartup.create(AppModule);
```

---

## Graceful shutdown

`TelemetryModule` registers an `onModuleDestroy` lifecycle hook that flushes all pending spans and metrics before the process exits. If you're not using `TelemetryModule`, call `TelemetrySdk.shutdown()` manually:

```typescript
import { TelemetrySdk } from "@grupodiariodaregiao/bunstone";

process.on("SIGTERM", async () => {
  await TelemetrySdk.shutdown();
  process.exit(0);
});
```
