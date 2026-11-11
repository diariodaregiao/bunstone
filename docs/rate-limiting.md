# Rate Limiting

Protect endpoints from abuse with the `@RateLimit()` decorator. It applies a fixed-window counter, adds informative `X-RateLimit-*` headers to every response, and returns `429 Too Many Requests` once the limit is hit.

## Basic Usage

Apply `@RateLimit()` to a controller method or to the whole controller (class-level applies to every route in it; a method-level decorator overrides the controller-level one). A class-level limit is inherited by subclasses of that controller.

```ts
import { Controller, Get, RateLimit } from "@grupodiariodaregiao/bunstone";

@Controller("api")
export class ApiController {
  @Get("limited")
  @RateLimit({ max: 2, windowMs: 10_000, message: "slow down" })
  limited() {
    return { ok: true };
  }

  @Get("open")
  open() {
    return { ok: true };
  }
}
```

Routes without the decorator are never rate limited.

## Configuration

```ts
interface RateLimitConfig {
  max: number;        // maximum requests allowed within the window
  windowMs: number;   // window length in milliseconds
  message?: string;   // body message returned on 429 (default: "Too many requests.")
  keyGenerator?: (ctx, clientAddress) => string; // custom bucket key
}
```

By default each request is keyed by `IP:METHOD:ROUTE`, where `ROUTE` is the route **template** (`/users/:id`) rather than the concrete path. This matters: keying on the concrete path would let a caller mint a fresh bucket for every value of `:id` and never hit the limit at all.

Override `keyGenerator` to key by something else, e.g. an authenticated user id. Its second argument is the client address already resolved through `trustProxy`, so a custom key stays correct behind a proxy:

```ts
@RateLimit({
  max: 100,
  windowMs: 60_000,
  keyGenerator: (ctx, ip) => ctx.headers.get("x-user-id") ?? ip,
})
```

## Behind a reverse proxy

Without configuration the client address is the **peer address** — behind Traefik, nginx, or a load balancer that is the proxy itself, so every client collapses into a single bucket. A limit of `max: 100` then applies to your whole traffic at once, and one caller can spend the budget and get everyone else a `429`.

Set `trustProxy` to the number of proxies in front of the app (`true` means one):

```ts
const app = await Application.create(AppModule, { trustProxy: true });
```

The address is then read from the `X-Forwarded-For` chain. Each proxy appends the peer it received from, so the chain reads `client, …, nearest-proxy` and the client sits `trustProxy` entries from the right. Counting from the right is what keeps this honest: entries a client prepends itself only push its real address further along, they never take the trusted slot. A chain too short to have crossed the configured proxies is ignored and the peer address is used instead.

```ts
// client → CDN → Traefik → app
await Application.create(AppModule, { trustProxy: 2 });
```

> **Only enable this when the app is unreachable except through those proxies.** If the app's port is also exposed directly, a client can forge the entire chain and pick its own bucket. In Docker, publish the proxy's port and leave the app's unpublished.

`clientAddress(ctx, trustProxy)` is exported if you need the same resolution elsewhere, for example in a guard or a custom `keyGenerator`.

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

The default storage is `MemoryStorage`: an in-process **fixed window** counter. When a window elapses the bucket resets, so a client is never permanently locked out — it simply gets a fresh allowance in the next window.

```ts
import { MemoryStorage } from "@grupodiariodaregiao/bunstone";

const storage = new MemoryStorage();
await storage.hit("key", 1, 20); // { allowed: true, remaining: 0, ... }
await storage.hit("key", 1, 20); // { allowed: false, ... }
```

`MemoryStorage` is single-instance only. It periodically sweeps expired buckets and is created automatically for the server, so you never have to instantiate it yourself for normal usage.

## Ordering

Rate limiting runs **before guards** in the request pipeline. A blocked request is rejected with `429` before any guard, validation, or handler code executes, so abusive traffic never reaches your authorization logic.
