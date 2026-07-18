# Rate Limiting

Protect endpoints from abuse with the `@RateLimit()` decorator. It applies a fixed-window counter, adds informative `X-RateLimit-*` headers to every response, and returns `429 Too Many Requests` once the limit is hit.

## Basic Usage

Apply `@RateLimit()` to a controller method or to the whole controller (class-level applies to every route in it; a method-level decorator overrides the controller-level one).

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
  keyGenerator?: (ctx) => string; // custom bucket key (default: IP + method + path)
}
```

By default each request is keyed by `IP:METHOD:PATH`. Override `keyGenerator` to key by something else, e.g. an authenticated user id:

```ts
@RateLimit({
  max: 100,
  windowMs: 60_000,
  keyGenerator: (ctx) => ctx.headers.get("x-user-id") ?? "anonymous",
})
```

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
