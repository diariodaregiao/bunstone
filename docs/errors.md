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
| `DatabaseError` | a database connection used before it is open |
| `EventStoreError` | the event store, including optimistic-concurrency conflicts |
| `CqrsError` | command and query buses — no handler registered |
| `RabbitMQError` | a publish that times out waiting for the broker, or that the broker cannot route |
| `ScheduleError` | invalid cron expressions or time zones |
| `ResponseValidationError` | a handler's return value rejected by its `@Returns` schema |
| `McpError` | `McpModule` — invalid primitives, schemas or options |
| `ImportError` | optional peer dependencies that are not installed |

`AdapterError`, `BullMQError`, `EmailError`, `GuardError`, `HttpParamError`, `RateLimitError`, `TestingError` and `UploadError` are still exported but **deprecated**: nothing in v1 throws them, and they will be removed in v2.0. See [`MIGRATION.md`](../MIGRATION.md#deprecated).

## Error codes

Codes are stable and greppable — they are safe to alert on. The prefix identifies the area:

| Prefix | Area | Examples |
|---|---|---|
| `BNS-DI-*` | dependency injection | `BNS-DI-001` undefined type (usually `import type` on an injected class), `BNS-DI-002` circular dependency, `BNS-DI-003` no provider registered, `BNS-DI-004` outside the module's boundary |
| `BNS-MOD-*` | modules | `BNS-MOD-001` not a module, `BNS-MOD-002` `undefined` entry (usually a circular import) |
| `BNS-CFG-*` | configuration | `BNS-CFG-002` a feature used without registering its module, `BNS-CFG-005` decorators compiled as standard (TC39) decorators — the process started outside the project directory |
| `BNS-HTTP-*` | routing | `BNS-HTTP-001` duplicate route, `BNS-HTTP-002` a built-in route collides with a controller, `BNS-HTTP-003` a response does not match its `@Returns` schema |
| `BNS-DB-*` | database | `BNS-DB-002` a connection module was never registered |
| `BNS-ES-*` | event store | `BNS-ES-001` concurrency conflict, `BNS-ES-002` commit over the document limit, `BNS-ES-003` aggregate is not snapshottable |
| `BNS-CQRS-*` | CQRS buses | `BNS-CQRS-001` no command handler, `BNS-CQRS-002` no query handler |
| `BNS-RMQ-*` | messaging | `BNS-RMQ-001` broker unreachable while publishing, `BNS-RMQ-002` a publish the broker could not route |
| `BNS-SCHED-*` | scheduling | invalid cron expression |
| `BNS-MCP-*` | MCP | `BNS-MCP-001` invalid decorator or option, `BNS-MCP-002` duplicate tool/resource/prompt, `BNS-MCP-003` `scopes` without `auth`, `BNS-MCP-004` unusable schema, `BNS-MCP-005` MCP server not started |
| `BNS-IMP-*` | optional drivers | `BNS-IMP-003` an optional peer dependency is not installed |

The codes of the deprecated classes (`BNS-ADP-*`, `BNS-EMAIL-*`, `BNS-GRD-*`, `BNS-MQ-*`, `BNS-RL-*`, `BNS-S3-*`, `BNS-TEST-*`) are never raised.

## Failing fast

Most of these are raised during `Application.create`, before the server accepts a single request: an unresolvable dependency, a duplicate route, an invalid cron expression or a module boundary violation stops the process at startup rather than surfacing on a rarely-hit endpoint later.
