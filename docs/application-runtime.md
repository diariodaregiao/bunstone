# Application Runtime

This page covers the runtime API that bootstraps a Bunstone application and the options that affect app behavior.

## `AppStartup.create()`

`AppStartup.create(RootModule, options?)` initializes the dependency graph, registers controllers, middleware, schedulers, queues, and returns an app reference.

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await AppStartup.create(AppModule, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  viewsDir: "src/views",
  swagger: {
    path: "/docs",
    documentation: {
      info: {
        title: "Bunstone API",
        version: "1.0.0",
      },
    },
  },
  rateLimit: {
    enabled: true,
    max: 100,
    windowMs: 60_000,
  },
});

app.listen(3000);
```

### Return value

`AppStartup.create()` resolves to an object with:

- `listen(port)` to start the HTTP server
- `getElysia()` to access the underlying Elysia instance

## Runtime Options

### `cors`

Passes options directly to `@elysiajs/cors`.

```typescript
const app = await AppStartup.create(AppModule, {
  cors: {
    origin: ["https://example.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

### `viewsDir`

When set, Bunstone scans the directory and bundles React views used by `@Render()` for SSR hydration.

```typescript
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views",
});
```

### `swagger`

Enables the built-in Swagger UI and JSON spec endpoint.

```typescript
const app = await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    documentation: {
      info: {
        title: "My API",
        version: "1.0.0",
      },
    },
    auth: {
      username: "admin",
      password: "secret",
    },
  },
});
```

### `rateLimit`

Applies a global rate limit that can be overridden by `@RateLimit()`.

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60_000,
  },
});
```

## Static Files

Bunstone serves the `public/` directory automatically under `/public`.

- Local file: `public/logo.png`
- Public URL: `/public/logo.png`

If `public/` does not exist yet, Bunstone creates it during startup.

## Error Handling

Built-in behavior during startup/runtime:

- `HttpException` instances return their configured status code and body.
- Zod validation errors are normalized to status `400` with `field` and `message`.
- Unknown errors return status `500`.

## Related Guides

- [Getting Started](./getting-started.md)
- [Routing & Parameters](./routing-params.md)
- [OpenAPI (Swagger)](./openapi.md)
- [Rate Limiting](./rate-limiting.md)
- [MVC & SSR](./mvc-ssr.md)
