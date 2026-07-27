# Errors

Bunstone throws typed errors with a stable code and, where possible, a suggestion telling you how to fix the problem. They are for *framework* failures — misconfiguration, a broken dependency graph, a queue that cannot be reached. For HTTP responses use [`HttpException` and its subclasses](./controllers.md#exceptions) instead.

## The base class

Every framework error extends `BunstoneError`:

```ts
abstract class BunstoneError extends Error {
  readonly code: string;                          // e.g. "BNS-DI-003"
  readonly suggestion?: string;                   // how to fix it
  readonly context?: Record<string, unknown>;     // the offending token, module, queue…
  readonly cause?: Error;                         // the original error, when wrapping one
}
```

`instanceof` works correctly for every subclass, and `cause` chains are preserved, so a wrapped driver error is still reachable.

The `message` carries the code and the suggestion, because that is what an uncaught error prints and what a logger records:

```
ConfigurationError: MongoEventStoreModule is not configured. The required module was never registered. [BNS-CFG-002]

  Call `MongoModule.register(...)` in your root AppModule imports before using this feature.
```

`summary` holds the first sentence alone when you want to log or match on it without the extra lines.

```ts
import { BunstoneError, DatabaseError } from "@grupodiariodaregiao/bunstone";

try {
  await repository.save(order);
} catch (error) {
  if (error instanceof DatabaseError) {
    logger.error(`[${error.code}] ${error.message}`, error.cause);
  }
}
```

## Catching by area

| Class | Raised by |
|---|---|
| `DependencyResolutionError` | the DI container — unresolvable, circular or out-of-scope dependencies |
| `ModuleInitializationError` | `@Module` compilation — not a module, `undefined` entry |
| `ConfigurationError` | invalid or conflicting application options, duplicate routes |
| `DatabaseError` | the SQL layer |
| `EventStoreError` | the event store, including optimistic-concurrency conflicts |
| `CqrsError` | command/query/event buses — missing or duplicate handlers |
| `RabbitMQError` | connection, topology and consumer failures |
| `ScheduleError` | invalid cron expressions and scheduler failures |
| `RateLimitError` | rate-limit storage failures |
| `GuardError` | guard resolution failures |
| `HttpParamError` | parameter extraction and validation |
| `UploadError` | multipart handling |
| `TestingError` | the testing module |
| `ImportError`, `AdapterError`, `EmailError`, `BullMQError` | optional integrations |

## Error codes

Codes are stable and greppable — they are safe to alert on. The prefix identifies the area:

| Prefix | Area | Examples |
|---|---|---|
| `BNS-DI-*` | dependency injection | `BNS-DI-001` undefined type (usually `import type` on an injected class), `BNS-DI-002` circular dependency, `BNS-DI-003` no provider registered, `BNS-DI-004` outside the module's boundary |
| `BNS-MOD-*` | modules | `BNS-MOD-001` not a module, `BNS-MOD-002` `undefined` entry (usually a circular import) |
| `BNS-CFG-*` | configuration | `BNS-CFG-002` a feature used without registering its module |
| `BNS-HTTP-*` | routing | `BNS-HTTP-001` duplicate route, `BNS-HTTP-002` a built-in route collides with a controller |
| `BNS-DB-*` | database | `BNS-DB-002` a connection module was never registered |
| `BNS-ES-*` | event store | `BNS-ES-001` concurrency conflict, `BNS-ES-002` commit over the document limit, `BNS-ES-003` aggregate is not snapshottable |
| `BNS-CQRS-*` | CQRS buses | missing or duplicate handler |
| `BNS-RMQ-*`, `BNS-MQ-*` | messaging | connection, topology and publish failures |
| `BNS-SCHED-*` | scheduling | invalid cron expression |
| `BNS-IMP-*` | optional drivers | `BNS-IMP-003` an optional peer dependency is not installed |
| `BNS-RL-*`, `BNS-GRD-*`, `BNS-TEST-*`, `BNS-ADP-*`, `BNS-EMAIL-*` | rate limiting, guards, testing, adapters, email |

## Failing fast

Most of these are raised during `Application.create`, before the server accepts a single request: an unresolvable dependency, a duplicate route, an invalid cron expression or a module boundary violation stops the process at startup rather than surfacing on a rarely-hit endpoint later.
