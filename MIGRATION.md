# Running on Bun 1.4

Bunstone requires Bun `>=1.4.4`. Bunstone's own API did not change, but a few
Bun 1.4 changes can affect an application:

- **Cron time zone.** Bun now reads cron schedules in the server's local zone.
  Bunstone pins `@Cron` to UTC, as it always documented, and adds
  `@Cron(expr, { tz })` for other zones.
- **`idleTimeout: 0`** is now accepted and disables the HTTP idle timeout.
- **SQL.** `Bun.SQL` no longer reads the `PASSWORD` environment variable, so pass
  the password explicitly or in the URL. MySQL `DATETIME` values decode as UTC,
  and MariaDB `JSON` columns come back parsed. An object passed as the
  parameters of `sql.unsafe` now binds named parameters (`:name`, `$name`, `@name`).
- **TLS.** `rediss://` URLs and `Bun.connect` verify certificates and hostnames
  by default.
- **TypeScript 6+** no longer discovers `@types` packages: add
  `"types": ["bun"]` to your `tsconfig.json`.

# Deprecated

These exports are left over from v0.7. Nothing in v1 throws or calls them, so
code that catches or calls them never runs. They still work and are still
exported, so importing them does not break, but they are marked `@deprecated`
and will be removed in **v2.0**.

| Deprecated | Codes | Use instead |
|---|---|---|
| `BullMQError` | `BNS-MQ-001`, `BNS-MQ-002` | nothing: there is no BullMQ integration. Use `RabbitMQError` for messaging. |
| `EmailError` | `BNS-EMAIL-001`, `BNS-EMAIL-002` | nothing: there is no email module. |
| `UploadError` | `BNS-S3-001`, `BNS-S3-002` | `StorageError` (`BNS-STG-*`) from [`StorageModule`](./docs/storage.md), the S3 integration. `@FormData()` and `saveUploads()` reject bad input with `BadRequestException` (400). |
| `AdapterError` | `BNS-ADP-001`, `BNS-ADP-002` | nothing: v1 runs on `Bun.serve` only, with no pluggable adapters. |
| `HttpParamError` | `BNS-HTTP-001`, `BNS-HTTP-002` | `BadRequestException`, which is what parameter extraction and validation throw. Its codes clash with the duplicate-route codes of `ConfigurationError`. |
| `GuardError` | `BNS-GRD-001` | `DependencyResolutionError`, which is what an unresolvable guard throws. |
| `RateLimitError` | `BNS-RL-001`, `BNS-RL-002` | nothing: it described a Redis storage v1 does not ship. |
| `TestingError` | `BNS-TEST-001` | `DependencyResolutionError`, which is what `TestingModule.get()` throws for an unknown provider. |

Static factories on error classes that are still in use, but which nothing calls:

| Deprecated | Code |
|---|---|
| `ModuleInitializationError.providersFailed()` | `BNS-MOD-001` |
| `ModuleInitializationError.unsupportedHttpMethod()` | `BNS-MOD-002` |
| `CqrsError.noEventHandler()` | `BNS-CQRS-003` |
| `DatabaseError.notInitialized()` | `BNS-DB-001` |
| `DatabaseError.invalidConfig()` | `BNS-DB-003` |
| `RabbitMQError.notConfigured()` | `BNS-RMQ-001` |
| `RabbitMQError.connectionFailed()` | `BNS-RMQ-002` |
| `RabbitMQError.topologyFailed()` | `BNS-RMQ-003` |
| `ScheduleError.invalidDelay()` | `BNS-SCHED-002` |
| `ImportError.typeOnlyImport()` | `BNS-IMP-001` |
| `ImportError.unknownExport()` | `BNS-IMP-002` |

The codes `BNS-MOD-001`, `BNS-MOD-002`, `BNS-RMQ-001` and `BNS-RMQ-002` are still
raised, by other code paths. The others in this table (`BNS-CQRS-003`,
`BNS-DB-001`, `BNS-DB-003`, `BNS-RMQ-003`, `BNS-SCHED-002`, `BNS-IMP-001`,
`BNS-IMP-002`) are never raised, so an alert on them never fires.

# Migrating from v0.7 to v1.0

Bunstone v1 is a clean rewrite. Elysia was removed entirely — the framework now
runs directly on native `Bun.serve`, `Bun.SQL` and `Bun.cron`. The public API
changed in several places. This guide lists the breaking changes.

## Bootstrap

```ts
// v0.7
const app = await AppStartup.create(AppModule, { swagger: {...}, viewsDir, rateLimit });
app.listen(3000, () => {});

// v1.0
const app = await Application.create(AppModule, { openapi: { info: { title, version } } });
app.listen(3000);
await app.close();
```

- `AppStartup` → `Application`.
- `listen(port)` no longer takes a callback and returns the app.
- `getElysia()` is gone — there is no Elysia instance.
- Graceful shutdown: `app.close()` (also wired to SIGINT/SIGTERM by default).

## Rate limiting

```ts
// v0.7
const app = await AppStartup.create(AppModule, {
  rateLimit: { max: 100, windowMs: 60_000 },
});

// v1.3+ — global
const app = await Application.create(AppModule, {
  rateLimit: { max: 100, windowMs: 60_000 },
});

// v1.0+ — per-route
@RateLimit({ max: 2, windowMs: 10_000 })
@Get("limited")
limited() {}

// v1.3+ — module scope
@Module({
  imports: [RateLimitModule.register({ max: 50, windowMs: 60_000 }), UsersModule],
})
export class AdminModule {}

// v1.3+ — opt out under global/module scope (method or controller)
@SkipRateLimit()
@Get("webhook")
webhook() {}

// v1.3+ — Redis fleet-wide storage (optional)
@Module({
  imports: [RateLimitModule.registerStorage({ url: process.env.REDIS_URL })],
})
export class AppModule {}
```

- Default storage is in-process (`MemoryStorage`); with N replicas the effective limit is about `max × N` unless you use `RateLimitModule.registerStorage()`.
- `@RateLimit()` on controllers/methods overrides global/module defaults (most specific wins).
- A global, prefix or module limit is one budget per client for the whole scope (as in v0.7's global limit), not a copy of the limit on every route. `@RateLimit()` stays per route.
- See [Rate limiting](./docs/rate-limiting.md) for the three levels, precedence, `@SkipRateLimit()`, `scope: "module"`, Redis, and `trustProxy`.

## HTTP

- `@SetResponseHeader` → `@SetHeader`.
- `@Request()` → `@Req()`; new `@Ctx()` gives the full `RequestContext`.
- Return-value serialization: objects → JSON, strings → text, `null`/`undefined` → 204.

## Guards

```ts
// v0.7
class AuthGuard implements GuardContract { validate(req) { ... } }
@Guard(AuthGuard)

// v1.0
class AuthGuard implements GuardContract { canActivate(ctx) { ... } }
@UseGuards(AuthGuard)
```

Guards are resolved from the DI container (list them in `providers`). Rejection returns `403`.

## JWT

```ts
// v1.0
JwtModule.register({ secret: "...", expiresIn: "1h" });
// @Jwt() guard, @JwtPayload() param
```

The `name` option was removed.

## Database (SQL)

```ts
// v0.7:  { provider: "postgresql", host: "..." }
// v1.0:
SqlModule.register({ adapter: "mysql", hostname: "localhost", port: 3306, username, password, database });
```

- `provider` → `adapter`, `host` → `hostname`.
- `SqlService`: `query`, `queryOne`, `transaction`, `.client`. The pool closes on shutdown.

## CQRS

- `CqrsModule` → `CqrsModule.register()`.
- `@EventsHandler` → `@EventHandler`.
- Event handlers run isolated (one failing handler no longer stops the others).
- New: full **event sourcing** (`AggregateRoot`, `EventStore`/`SqlEventStore`, `EventSourcedRepository`).

## RabbitMQ

The API was simplified. `@RabbitSubscribe({ queue })` is queue-mode; the handler
receives `RabbitMessage<T>` (`{ data, raw, attempt }`) and **acks automatically on
success**. Throwing triggers retry-with-backoff and then the `deadLetterQueue`.
A per-consumer **circuit breaker** and automatic **consumer re-registration on
reconnect** are built in. Install `amqplib` (optional peer dependency).

## Removed

- **SSR / `@Render` / React views** — use SSE (`@Sse`) or WebSocket
  (`@WebSocketGateway`) for real-time instead.
- **BullMQ, Email and the Cache/Upload adapters** are not part of the v1 core yet.

## Removed dependencies

`@nestjs/*`, `express`, `fastify`, `elysia` and `@elysiajs/*` are gone. The
published bundle dropped from several megabytes to ~90 KB.
