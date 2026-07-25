# CORS

Enable CORS with the `cors` option. `true` uses the defaults; an object configures it.

```ts
const app = await Application.create(AppModule, { cors: true });
```

```ts
const app = await Application.create(AppModule, {
  cors: {
    origin: ["https://app.example.com", "https://admin.example.com"],
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type", "authorization"],
    exposedHeaders: ["x-request-id"],
    credentials: true,
    maxAge: 86_400,
  },
});
```

## Options

| Option | Type | Meaning |
|---|---|---|
| `origin` | `string \| string[] \| boolean` | Allowed origins. `"*"` (default) allows any; `true` reflects the caller's origin; `false` disables CORS; a string is a fixed origin; an array is an allowlist. |
| `methods` | `string[]` | Methods advertised in the preflight response. Defaults to the common set. |
| `allowedHeaders` | `string[]` | Request headers the browser may send. Defaults to echoing what the client asked for. |
| `exposedHeaders` | `string[]` | Response headers JavaScript is allowed to read. |
| `credentials` | `boolean` | Allow cookies and `Authorization` on cross-origin requests. |
| `maxAge` | `number` | How long the browser may cache the preflight, in seconds. |

## Credentials require an explicit origin

`credentials: true` combined with a wildcard origin is refused **at startup**:

```ts
// throws BNS-CFG-003
Application.create(AppModule, { cors: { credentials: true } });
```

```
`cors.credentials` requires an explicit `origin` allowlist.
  Set `origin` to the exact origins you trust, for example
  `origin: ["https://app.example.com"]`. A wildcard origin cannot be
  combined with credentials.
```

This is not a limitation of the framework but of the CORS specification: a browser rejects `Access-Control-Allow-Origin: *` alongside `Access-Control-Allow-Credentials: true`, so the combination never works. Reflecting the caller's origin instead would be worse — it would let *any* site read authenticated responses. Failing at startup makes the misconfiguration obvious instead of leaving credentialed requests mysteriously blocked in the browser.

The fix is always to list the origins you actually trust:

```ts
cors: { credentials: true, origin: ["https://app.example.com"] }
```

## Preflight

`OPTIONS` requests carrying `Access-Control-Request-Method` are answered with `204` and the configured methods, headers and max-age. This happens **before** guards and rate limiting, as the specification requires — a preflight carries no credentials and must not be rejected by your authorization logic.

A preflight is answered even when the route defines its own `@Options()` handler; the handler still runs for non-preflight `OPTIONS` requests.

## Vary

Responses whose CORS headers depend on the request origin carry `Vary: Origin`, including responses to origins that were **rejected**. Without that, a shared cache could serve a rejected-origin response to an allowed origin and break legitimate cross-origin calls.

## Where CORS headers apply

CORS headers are applied to every response the application produces: successful handlers, errors, rate-limit `429`s, `404`s and `405`s from the router, static files, and Server-Sent Events streams. A cross-origin `EventSource` works with the same configuration as the rest of the API.
