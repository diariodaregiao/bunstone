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

// v1.0 — global (restored)
const app = await Application.create(AppModule, {
  rateLimit: { max: 100, windowMs: 60_000 },
});

// v1.0 — per-route (always available)
@RateLimit({ max: 2, windowMs: 10_000 })
@Get("limited")
limited() {}

// v1.0 — module scope
@Module({
  imports: [RateLimitModule.register({ max: 50, windowMs: 60_000 }), UsersModule],
})
export class AdminModule {}

// v1.0 — opt out under global/module scope (method or controller)
@SkipRateLimit()
@Get("webhook")
webhook() {}

// v1.1+ — Redis fleet-wide storage (optional)
@Module({
  imports: [RateLimitModule.registerStorage({ url: process.env.REDIS_URL })],
})
export class AppModule {}
```

- Default storage is in-process (`MemoryStorage`); with N replicas the effective limit is about `max × N` unless you use `RateLimitModule.registerStorage()`.
- `@RateLimit()` on controllers/methods overrides global/module defaults (most specific wins).
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
