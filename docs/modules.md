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
- `exports` — the module's public surface: the tokens modules that import it may resolve.
- `global` — when `true`, this module's public surface is available everywhere without being imported.

Providers are singletons across the whole application: an imported provider is the same instance everywhere it is used.

## Module boundaries

By default any provider can resolve any other, whether or not it was exported. Turn on `strictModuleBoundaries` to have the container enforce the boundaries you declared:

```ts
const app = await Application.create(AppModule, {
  strictModuleBoundaries: true,
});
```

With it on, a provider declared in module `M` may resolve:

- providers declared in `M` itself,
- whatever the modules `M` imports list in their `exports`,
- and the public surface of any `global` module.

Anything else fails **at startup**, not at request time, with the token, the module that asked for it and the module that owns it:

```
`OrdersService` cannot resolve `UsersRepository`: it is not part of any module it imports.
  Add `UsersRepository` to the `exports` array of the module that provides it (`UsersModule`),
  and make sure `OrdersModule` lists that module in its `imports`.
```

A module that declares no `exports` keeps everything private:

```ts
@Module({
  providers: [UsersRepository, UsersService],
  exports: [UsersService],       // UsersRepository stays internal
})
export class UsersModule {}
```

Re-exporting works too — a module may export a token it received from one of its own imports, which lets an aggregate module present a single public surface.

### Migrating an existing application

The option is off by default because enabling it can reject an application that today resolves across a boundary it never declared. Turn it on one service at a time: every failure names exactly which `exports` entry or `imports` entry is missing, and nothing fails silently. Once a service boots cleanly with it on, leave it on — the boundary is then enforced rather than merely documented.

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

`onModuleDestroy` hooks are **isolated**: if one throws, the remaining hooks still run and the failures are reported together as an `AggregateError` once shutdown finishes. Framework resources (scheduler, queue consumers, HTTP server) are stopped *before* these hooks run, so a scheduled job cannot fire against a connection pool your hook has just closed.

If bootstrap fails part-way through `Application.create`, everything already started is torn down before the error propagates — no orphaned timers or open connections.

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
