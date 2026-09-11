# Rate Limiting

Protect endpoints from abuse with rate limiting at three optional levels. Each level uses the same `RateLimitConfig` shape. A fixed-window counter adds `X-RateLimit-*` headers to every limited response and returns `429 Too Many Requests` once the limit is hit.

## Three levels

All three levels are optional. You can enable any combination:

| Level | How | Applies to |
|---|---|---|
| **Global** | `Application.create({ rateLimit })` | Every controller route |
| **Module / controller group** | `RateLimitModule.register(...)` or `@RateLimit()` on a controller class | A module subtree, a single module, or all routes in one controller |
| **Route** | `@RateLimit()` on a handler method | One endpoint |

```ts
import { Application, Controller, Get, Module, RateLimit, RateLimitModule } from "@grupodiariodaregiao/bunstone";

// Global default
const app = await Application.create(AppModule, {
  rateLimit: { max: 200, windowMs: 60_000 },
  trustProxy: true,
});

// Module scope (subtree by default)
@Module({
  imports: [RateLimitModule.register({ max: 50, windowMs: 60_000 })],
})
export class AdminModule {}

// Controller group
@RateLimit({ max: 10, windowMs: 10_000 })
@Controller("api")
export class ApiController {
  @Get("limited")
  @RateLimit({ max: 2, windowMs: 10_000, message: "slow down" })
  limited() {
    return { ok: true };
  }
}
```

Routes without any matching configuration are never rate limited.

## Resolution order

The **most specific** level wins. For each route the effective config is the first match:

1. `@SkipRateLimit()` — no limit
2. `@RateLimit()` on the **method**
3. `@RateLimit()` on the **controller class**
4. `RateLimitModule.register(...)` on the controller's module (subtree or local scope)
5. `rateLimit.prefixes` — longest matching path prefix
6. `Application.create({ rateLimit })` global default
7. none — no limit

Method overrides controller, controller overrides module, module overrides prefix, prefix overrides global.

## Path prefix

Limit a group of routes by URL prefix inside the global config:

```ts
const app = await Application.create(AppModule, {
  rateLimit: {
    max: 200,
    windowMs: 60_000,
    prefixes: [
      { path: "/auth", max: 20, windowMs: 60_000 },
      { path: "/auth/admin", max: 5, windowMs: 60_000 },
    ],
  },
});
```

A prefix `/auth` matches `/auth`, `/auth/login`, and `/auth/:id`. When several prefixes match, the **longest** wins. Each route template still gets its own bucket (`/auth/login` and `/auth/:id` do not share a counter).

## Module scope

`RateLimitModule.register(...)` accepts an optional `scope`:

- **`subtree`** (default) — the module that imports it **and every module it imports**.
- **`module`** — only controllers **declared in the importing module**; imported modules stay open.

```ts
// Only AdminController is limited; UsersModule controllers are not.
@Module({
  imports: [
    RateLimitModule.register({ max: 50, windowMs: 60_000, scope: "module" }),
    UsersModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
```

If a module is imported through more than one path, the first compiled path wins — order your root `imports` accordingly.

## Exceptions

Opt routes out when global or module scope is active:

**On a single route:**

```ts
@Get("webhook")
@SkipRateLimit()
webhook() {
  return { ok: true };
}
```

**On a whole controller:**

```ts
@SkipRateLimit()
@Controller("internal")
export class InternalController {}
```

**On the global default** — exclude route templates via `skip`:

```ts
const app = await Application.create(AppModule, {
  rateLimit: {
    max: 200,
    windowMs: 60_000,
    skip: ["/webhooks/stripe"],
  },
});
```

Built-in routes (`/health`, `/ready`, OpenAPI, static files) are **never** rate limited. When `health: true` is enabled, `/health` and `/ready` are also excluded from the global limit on controller routes (so orchestrator probes never receive `429` even if a controller is mounted on the same path).

## Configuration

```ts
interface RateLimitConfig {
  max: number;        // maximum requests allowed within the window
  windowMs: number;   // window length in milliseconds
  message?: string;   // body message returned on 429 (default: "Too many requests.")
  keyGenerator?: (ctx, clientAddress) => string; // custom bucket key
}
```

`keyGenerator` is available at every level — the winning config's generator is used.

By default each request is keyed by `IP:METHOD:ROUTE`, where `ROUTE` is the route **template** (`/users/:id`) rather than the concrete path. This applies to the global limit too: each URL template gets its own budget, so an attack on one route does not exhaust the allowance for others.

Override `keyGenerator` to key by something else, e.g. an authenticated user id. Its second argument is the client address already resolved through `trustProxy`:

```ts
@RateLimit({
  max: 100,
  windowMs: 60_000,
  keyGenerator: (ctx, ip) => ctx.headers.get("x-user-id") ?? ip,
})
```

## Behind a reverse proxy

Without configuration the client address is the **peer address** — behind Traefik, nginx, or a load balancer that is the proxy itself, so every client collapses into a single bucket.

Set `trustProxy` to the number of proxies in front of the app (`true` means one):

```ts
// Traefik alone in front of the app
const app = await Application.create(AppModule, { trustProxy: true });
```

```ts
// client → CDN → Traefik → app
await Application.create(AppModule, { trustProxy: 2 });
```

The address is read from the `X-Forwarded-For` chain. Each proxy appends the peer it received from, so the client sits `trustProxy` entries from the right. A chain too short to have crossed the configured proxies is ignored and the peer address is used instead.

> **Only enable this when the app is unreachable except through those proxies.** If the app's port is also exposed directly, a client can forge the entire chain and pick its own bucket. In Docker, publish the proxy's port and leave the app's unpublished.

`clientAddress(ctx, trustProxy)` is exported if you need the same resolution elsewhere.

End-to-end checks behind Traefik (two replicas, `trustProxy`, Redis, header preservation) live in [`tests/ratelimit/traefik/README.md`](../tests/ratelimit/traefik/README.md). Run `bun test tests/ratelimit/traefik.e2e.test.ts` when Docker is available.

## Response Headers

Every response to a rate-limited route carries:

```
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 1
X-RateLimit-Reset: 1706640000
```

When the limit is exceeded the request is rejected with `429` and a `Retry-After` header (seconds until the window resets):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706640000
Retry-After: 8

{ "message": "slow down" }
```

## Storage

### Memory (default)

The default storage is `MemoryStorage`: an in-process **fixed window** counter. When a window elapses the bucket resets, so a client is never permanently locked out.

`MemoryStorage` is **per process instance** only. With multiple replicas behind Traefik or another load balancer, each pod keeps its own counters — a client can send up to roughly `max × replicas` requests per window across the fleet.

No extra setup is required; memory storage is created automatically.

### Redis (optional)

For a fleet-wide cap across replicas, import `RateLimitModule.registerStorage()` in your root module:

```ts
import { Module, RateLimitModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    RateLimitModule.registerStorage({
      url: process.env.REDIS_URL, // defaults to REDIS_URL / redis://localhost:6379
      onFailure: "allow",         // recommended default
    }),
  ],
})
export class AppModule {}
```

`RedisStorage` uses Bun's native `RedisClient` (the same client as `CacheModule`) with atomic `INCR`. Apps that do not import `registerStorage` keep using `MemoryStorage` — no new dependency is required.

When Redis is unreachable:

| `onFailure` | Behaviour |
|---|---|
| `"allow"` (default) | Log a warning and let the request through |
| `"reject"` | Fail with `RateLimitError` (HTTP 500) |

Pass a custom `RateLimitStorage` through `Application.create({ rateLimitStorage })` for tests or your own backend.

## Ordering

Rate limiting runs **before guards** in the request pipeline. A blocked request is rejected with `429` before any guard, validation, or handler code executes, so abusive traffic never reaches your authorization logic.
