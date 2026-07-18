# Modules

A module groups related controllers and providers and wires them into the dependency graph. Every application has one root module passed to `Application.create`.

## @Module()

```ts
import { Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [SharedModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
  global: false,
})
export class UsersModule {}
```

The metadata fields are all optional:

- `imports` — other modules (or dynamic modules) whose providers are added to the graph.
- `controllers` — controller classes whose routes are registered.
- `providers` — injectable classes or provider objects (see [Dependency Injection](./dependency-injection.md)).
- `exports` — tokens made available to modules that import this one.
- `global` — when `true`, this module's providers are available everywhere without being imported explicitly.

Because the container is a single shared graph, an imported provider is the same singleton everywhere it is used.

## Dynamic modules

A module can be configured at import time by exposing a static method that returns a `DynamicModule`. The returned object always carries a `module` reference plus whatever metadata the configuration produces.

```ts
import type { DynamicModule } from "@grupodiariodaregiao/bunstone";
import { InjectionToken } from "@grupodiariodaregiao/bunstone";

export const CACHE_OPTIONS = new InjectionToken<{ ttl: number }>("CacheOptions");

export class CacheModule {
  static register(options: { ttl: number }): DynamicModule {
    return {
      module: CacheModule,
      global: true,
      providers: [
        { provide: CACHE_OPTIONS, useValue: options },
        CacheService,
      ],
      exports: [CacheService],
    };
  }
}
```

Import it by calling the method:

```ts
@Module({
  imports: [CacheModule.register({ ttl: 60 })],
})
export class AppModule {}
```

`JwtModule.register(...)` follows exactly this pattern.

## Lifecycle hooks

Providers can implement lifecycle interfaces. Bunstone calls the matching methods during startup and shutdown, awaiting async implementations.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";
import type {
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from "@grupodiariodaregiao/bunstone";

@Injectable()
export class Worker
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  async onModuleInit() {
    // runs after all providers are constructed
  }

  onApplicationBootstrap() {
    // runs after the HTTP server and wiring are ready
  }

  async onModuleDestroy() {
    // runs on shutdown, in reverse order
  }
}
```

Order of execution:

1. `onModuleInit` — after the container instantiates every provider.
2. `onApplicationBootstrap` — after CQRS/messaging wiring and server setup.
3. `onModuleDestroy` — during `app.close()`, in reverse registration order.

## Bootstrapping the application

`Application.create(rootModule, options?)` compiles the modules, builds the DI graph, runs `onModuleInit` and `onApplicationBootstrap`, and returns an `Application`.

```ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule, {
  gracefulShutdown: true,
  logStartup: true,
  cors: true,
});

app.listen(3000);
```

Common options:

- `gracefulShutdown` — install `SIGINT`/`SIGTERM` handlers that call `close()` and exit. Default `true`.
- `logStartup` — log the listening URL and route count. Default `true`.
- `cors` — enable CORS (`true` for defaults, or a `CorsOptions` object).

## Starting and stopping

`app.listen(port?)` starts `Bun.serve`. Passing `0` (or omitting the port) lets Bun choose a free port, which is handy in tests.

```ts
app.listen(3000);
```

`app.close()` performs a graceful shutdown: it runs `onModuleDestroy` hooks in reverse order, then disposes registered resources (schedulers, connections, the HTTP server). It is idempotent.

```ts
await app.close();
```

When `gracefulShutdown` is left enabled, `close()` is also invoked automatically on `SIGINT` and `SIGTERM`.
