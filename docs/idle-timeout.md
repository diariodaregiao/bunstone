# HTTP idle timeout

Control how long the HTTP server keeps an **idle** TCP connection open before
closing it. This is configured on `Application.create` and applied when you call
`app.listen()`.

This option is for **`Bun.serve`** (your API). It is unrelated to
[`idleTimeout` on `SqlModule`](./database.md#options), which configures the SQL
connection pool.

## Configuration

Pass `idleTimeout` in milliseconds:

```ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule, {
  idleTimeout: 10_000,
});

app.listen(3000);
```

When `idleTimeout` is omitted, Bunstone uses **10_000** milliseconds (10 seconds).

## How it maps to Bun

`Bun.serve` expects `idleTimeout` in **seconds**, with a maximum of **255**.
Bunstone keeps your option in **milliseconds** for consistency with other timeouts
in the ecosystem, then converts when starting the server:

- values are rounded **up** to the next whole second (`500` → `1` second);
- the minimum passed to Bun is **1** second.

| You pass (`idleTimeout`) | Bun receives |
|--------------------------|--------------|
| `10_000` (default)       | `10`         |
| `25_000`                 | `25`         |
| `500`                    | `1`          |

The largest value you can set is **255_000** ms (255 seconds).

## Validation

`idleTimeout` is checked during `Application.create`, before the server binds a
port. Invalid values throw `ConfigurationError` (`BNS-CFG-001`) at startup.

| Value | Result |
|-------|--------|
| Omitted | Default `10000` |
| Positive integer (ms) | Used as configured |
| `0`, negative, or non-integer | Rejected |
| Non-numeric (e.g. a string at runtime) | Rejected |
| Greater than `255_000` | Rejected |

```ts
// throws at create — not at listen
await Application.create(AppModule, { idleTimeout: -1 });
```

## What counts as idle

The limit applies to the whole request, regardless of method: a `GET` and a
`POST` whose handler is still working with no bytes exchanged are closed alike
once `idleTimeout` elapses. Bunstone re-arms the timeout per request after the
body has been read, because Bun does not enforce it on a request that carries a
body until then.

Two caveats from Bun itself:

- Bun checks idle connections on a coarse timer, so a connection may be closed up
  to a few seconds after the configured value (`2_000` closed at about 4 s).
- A request body that the handler never reads (no `@Body()`, `@FormData()` or
  similar) is not covered.

## When to tune it

- **Lower** values reclaim connections sooner behind proxies or under high churn.
- **Higher** values suit keep-alive heavy clients, as long as you stay within the
  Bun limit (255 seconds).

For graceful teardown of in-flight work and probes, see
[Deployment](./deployment.md).
