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

Every HTTP request produces:

- A span named `{METHOD} {route}` (e.g. `GET /users/:id`) with `http.request.method`, `http.route`, and `http.response.status_code`. Responses with status `>= 500` are marked as error spans.
- A `http.server.request.duration` histogram (milliseconds), tagged with method and route.

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

## Log correlation

The built-in `Logger` automatically includes `trace_id` and `span_id` whenever a span is active for the current request, so log lines can be correlated with their trace in your backend. No configuration is required — it works as soon as `TelemetryModule` is registered.

## Shutdown

`TelemetryModule` registers an `onModuleDestroy` hook that flushes all pending spans and metrics when the application closes, so nothing is lost on graceful shutdown.
