# Logging

Bunstone ships a small structured logger. The framework uses it internally (startup, scheduled jobs, queue consumers, reconnections) and you can use the same class in your own providers.

## Usage

Give each logger a name so lines can be traced back to their source.

```ts
import { Injectable, Logger } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger("Orders");

  place(orderId: string) {
    this.logger.info("placing order", { orderId });
  }
}
```

## Levels

```ts
enum LogLevel {
  DEBUG = 0,
  INFO  = 1,
  WARN  = 2,
  ERROR = 3,
  FATAL = 4,
}
```

Methods: `debug`, `info`, `log` (an alias of `info`), `warn`, `error`, `fatal`. Anything below the configured level is dropped.

## Options

```ts
new Logger("Orders", {
  level: LogLevel.DEBUG,   // minimum level to emit (default INFO)
  timestamp: true,         // include an ISO timestamp
  pretty: false,           // human-readable with colours, or JSON
});
```

`pretty` defaults to whether stdout is a TTY: colourised output in a terminal, and single-line JSON when the process is piped or running in a container, which is what a log shipper wants.

## Structured output

In JSON mode each line is one object:

```json
{"timestamp":"2026-07-25T18:43:47.807Z","level":"INFO","name":"Orders","message":"placing order {\"orderId\":\"o-1\"}"}
```

Errors keep their identity instead of collapsing to `{}`:

```ts
logger.error("failed", new Error("boom", { cause: new Error("root cause") }));
```

```json
{"level":"ERROR","name":"Orders","message":"failed {\"name\":\"Error\",\"message\":\"boom\",\"stack\":\"...\",\"cause\":{\"name\":\"Error\",\"message\":\"root cause\",\"stack\":\"...\"}}"}
```

Serialization is cycle-safe: an object that references itself logs `"[Circular]"` rather than throwing. A log statement can never crash the code path it was there to diagnose.

## Trace correlation

When [`TelemetryModule`](./observability.md) is registered and a span is active, every line automatically carries `trace_id` and `span_id`, so a log can be opened directly against its trace in Grafana, Jaeger or any OTLP backend. No configuration is required — it works as soon as telemetry is on, and adds nothing when it is off.
