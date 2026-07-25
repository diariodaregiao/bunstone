# Bunstone AGENTS Guide

This file is published with `@grupodiariodaregiao/bunstone` so coding agents
can read the full documentation directly from `node_modules`.

Bunstone is a decorator-based framework for Bun (DI, HTTP over native
`Bun.serve`, CQRS + event sourcing, RabbitMQ, scheduling via `Bun.cron`,
SSE & WebSocket, OpenTelemetry). Import everything from
`@grupodiariodaregiao/bunstone`.

## Public exports (129)

- `AdapterError`
- `AggregateRoot`
- `ApiOperation`
- `ApiResponse`
- `ApiTags`
- `Application`
- `BadRequestException`
- `Body`
- `BullMQError`
- `BunstoneError`
- `CACHE_CLIENT`
- `CacheModule`
- `CacheService`
- `CircuitBreaker`
- `CircuitOpenError`
- `CommandBus`
- `CommandHandler`
- `ConfigurationError`
- `ConflictException`
- `Container`
- `Controller`
- `Cors`
- `CqrsError`
- `CqrsModule`
- `Cron`
- `Ctx`
- `DEFAULT_RETRY`
- `DatabaseError`
- `Delete`
- `DependencyResolutionError`
- `DisposableRegistry`
- `EVENT_STORE`
- `EmailError`
- `EventBus`
- `EventHandler`
- `EventSourcedRepository`
- `EventSourcingModule`
- `EventStoreError`
- `ForbiddenException`
- `FormData`
- `Get`
- `GuardError`
- `Head`
- `Header`
- `HttpException`
- `HttpParamError`
- `ImportError`
- `Inject`
- `Injectable`
- `InjectionToken`
- `InternalServerErrorException`
- `Interval`
- `JWT_OPTIONS`
- `Jwt`
- `JwtGuard`
- `JwtModule`
- `JwtPayload`
- `JwtService`
- `LogLevel`
- `Logger`
- `MemoryStorage`
- `Module`
- `ModuleInitializationError`
- `NotFoundException`
- `Options`
- `Param`
- `Patch`
- `Post`
- `Put`
- `Query`
- `QueryBus`
- `QueryHandler`
- `QueueConsumer`
- `RABBIT_OPTIONS`
- `RabbitConnection`
- `RabbitConsumer`
- `RabbitMQError`
- `RabbitMQModule`
- `RabbitMQService`
- `RabbitSubscribe`
- `RateLimit`
- `RateLimitError`
- `Req`
- `SQL_CLIENT`
- `ScheduleError`
- `Scheduler`
- `SetHeader`
- `SqlEventStore`
- `SqlModule`
- `SqlService`
- `Sse`
- `State`
- `StaticFiles`
- `TELEMETRY_OPTIONS`
- `TelemetryModule`
- `TelemetrySdk`
- `TelemetryService`
- `Test`
- `TestApp`
- `TestingError`
- `TestingModule`
- `TestingModuleBuilder`
- `Timeout`
- `TooManyRequestsException`
- `UnauthorizedException`
- `UnprocessableEntityException`
- `UploadError`
- `UseGuards`
- `WebSocketGateway`
- `assertOpenApiBasicAuth`
- `backoffDelay`
- `buildOpenApiDocument`
- `compileModules`
- `createSqlClient`
- `declareRetryTopology`
- `declareTopology`
- `getRateLimit`
- `getSchedules`
- `getSubscriptions`
- `instrumentRequest`
- `isInjectable`
- `isRabbitConsumer`
- `retryDelays`
- `retryQueueName`
- `shouldRetry`
- `sseResponse`
- `swaggerUiHtml`
- `wireCqrs`
- `wireRabbit`

## Documentation

## docs/index.md

# Bunstone

Bunstone is a decorator-based framework for [Bun](https://bun.sh), inspired by NestJS but deliberately smaller. It is **Bun-native**: the HTTP layer is built directly on `Bun.serve` and the standard `Request`/`Response` objects. There is no Elysia, no Express, and no other server framework underneath.

## Features

- **Dependency injection** — a recursive DI container with constructor injection, injection tokens, and singleton providers.
- **Decorator-based routing** — `@Controller`, `@Get`, `@Post`, and friends map classes and methods to routes.
- **Zod validation** — pass a Zod schema to `@Body`, `@Query`, or `@Param` for automatic parsing and validation.
- **Modules** — group controllers and providers with `@Module`, compose them with `imports`, and share them with `exports` or `global`.
- **Lifecycle hooks** — `OnModuleInit`, `OnApplicationBootstrap`, and `OnModuleDestroy`.
- **Guards** — `@UseGuards` with DI-injected guard classes.
- **JWT auth** — a ready-made `JwtModule`, `JwtService`, `@Jwt()` guard, and `@JwtPayload()` parameter.
- **Graceful shutdown** — `app.close()` runs destroy hooks and disposers; `SIGINT`/`SIGTERM` are handled automatically.

## Installation

```bash
bun add @grupodiariodaregiao/bunstone reflect-metadata
```

Enable decorator metadata in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Hello world

```ts
import "reflect-metadata";
import { Application, Controller, Get, Module } from "@grupodiariodaregiao/bunstone";

@Controller()
class AppController {
  @Get()
  hello() {
    return { message: "Hello from Bunstone!" };
  }
}

@Module({
  controllers: [AppController],
})
class AppModule {}

const app = await Application.create(AppModule);
app.listen(3000);
```

Run it with Bun and open `http://localhost:3000`.

## Next steps

- [Getting Started](./getting-started.md)
- [Dependency Injection](./dependency-injection.md)
- [Modules](./modules.md)
- [Controllers](./controllers.md)
- [Guards & JWT](./guards-jwt.md)
- [Uploads & static files](./uploads-and-static.md)
- [Database](./database.md) · [Cache](./cache.md) · [CQRS](./cqrs.md) · [Event sourcing](./event-sourcing.md)
- [Messaging](./messaging.md) · [Scheduling](./scheduling.md) · [Realtime](./realtime.md)
- [Rate limiting](./rate-limiting.md) · [Logging](./logging.md) · [Observability](./observability.md) · [Errors](./errors.md)
- [Testing](./testing.md) · [OpenAPI](./openapi.md) · [CLI](./cli.md) · [Deployment](./deployment.md)

## docs/getting-started.md

# Getting Started

This guide walks through creating a Bunstone application from scratch.

## Scaffold a project

The fastest way to start is the CLI:

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app
bun install
```

Or add Bunstone to an existing Bun project:

```bash
bun add @grupodiariodaregiao/bunstone reflect-metadata
```

Make sure decorators are enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Project structure

A typical Bunstone project looks like this:

```
src/
  main.ts
  app.module.ts
  app.controller.ts
```

## The entry point

`reflect-metadata` must be imported once, before anything else, so decorator metadata is available. Bootstrapping is asynchronous: `Application.create` builds the DI graph and runs the init hooks, and `listen` starts the server.

```ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule);
app.listen(3000);
```

## The root module

Every application has one root module. It declares the controllers to expose and the providers to register.

```ts
import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./app.controller";

@Module({
  controllers: [AppController],
})
export class AppModule {}
```

## A controller

Controllers turn classes into route handlers. The return value is serialized automatically (objects become JSON).

```ts
import { Controller, Get, Param } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class AppController {
  @Get()
  list() {
    return [{ id: "1", name: "Ada" }];
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id };
  }
}
```

With the module and controller above, `GET /users` and `GET /users/:id` are live.

## Next steps

- [Dependency Injection](./dependency-injection.md)
- [Modules](./modules.md)
- [Controllers](./controllers.md)
- [Guards & JWT](./guards-jwt.md)

## docs/dependency-injection.md

# Dependency Injection

Bunstone resolves classes and their dependencies through a container. Providers are constructed once and cached, so every consumer shares the same singleton instance within an application.

## @Injectable()

Mark a class as injectable so it can be constructed by the container and receive dependencies.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class GreetService {
  greet(name: string) {
    return `hello ${name}`;
  }
}
```

## Constructor injection

Declare dependencies as constructor parameters. Their types are read from decorator metadata and resolved automatically.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersService {
  constructor(private readonly greet: GreetService) {}

  welcome(name: string) {
    return this.greet.greet(name);
  }
}
```

## Injection tokens

Non-class dependencies (config objects, interfaces, primitives) are keyed by an `InjectionToken`. Use `@Inject(TOKEN)` to point a parameter at the token.

```ts
import { Inject, Injectable, InjectionToken } from "@grupodiariodaregiao/bunstone";

interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>("AppConfig");

@Injectable()
export class ApiClient {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  base() {
    return this.config.apiUrl;
  }
}
```

## Provider forms

Providers are declared in a module's `providers` array. A bare class is shorthand for `{ provide: Class, useClass: Class }`. The other forms bind a token to a value, a class, or a factory.

```ts
@Module({
  providers: [
    GreetService,
    { provide: APP_CONFIG, useValue: { apiUrl: "https://api.example.com" } },
    { provide: GreetService, useClass: GreetService },
    {
      provide: ApiClient,
      useFactory: (config: AppConfig) => new ApiClient(config),
      inject: [APP_CONFIG],
    },
  ],
})
export class AppModule {}
```

The `inject` array lists the tokens that are resolved and passed, in order, to `useFactory`.

## Singletons

Each token resolves to a single instance for the life of the application. Two services that depend on the same provider receive the exact same object.

```ts
container.resolve(A).shared === container.resolve(B).shared; // true
```

## Cycle detection

If two providers depend on each other, the container throws a clear circular-dependency error instead of overflowing the stack.

```ts
const A = new InjectionToken("A");
const B = new InjectionToken("B");

container.register({ provide: A, useFactory: (b) => ({ b }), inject: [B] });
container.register({ provide: B, useFactory: (a) => ({ a }), inject: [A] });

container.resolve(A); // throws: Circular dependency
```

## docs/modules.md

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

## docs/controllers.md

# Controllers

Controllers map incoming HTTP requests to methods. A controller is a class decorated with `@Controller`; its methods are decorated with an HTTP-method decorator.

## @Controller()

The argument is an optional base path that is prepended to every route in the class.

```ts
import { Controller, Get } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get()
  list() {
    return { list: ["ada", "linus"] };
  }
}
```

Register the controller in a module's `controllers` array to activate it. Controllers participate in DI, so they can receive providers through their constructor.

## HTTP methods

Each decorator takes an optional sub-path (default `/`):

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Patch(path?)`
- `@Delete(path?)`
- `@Head(path?)`
- `@Options(path?)`

```ts
@Controller("posts")
export class PostsController {
  @Get(":id")
  findOne() {}

  @Post()
  create() {}

  @Delete(":id")
  remove() {}
}
```

`HEAD` is served automatically wherever `GET` is: Bunstone registers a `HEAD` handler that returns the same status and headers with no body, unless you declare your own.

A request to a known path with a method no handler covers gets `405 Method Not Allowed` with an `Allow` header listing the supported methods. Only an unknown path returns `404`.

Declaring the same method and path twice raises a configuration error at startup rather than silently letting one handler shadow the other.

## Parameters

Parameter decorators pull data out of the request into method arguments:

- `@Param(name?)` — a path parameter, or the full params object when called without a name.
- `@Query(name?)` — a query-string value, or the full query object when called without a name.
- `@Body(schema?)` — the parsed request body.
- `@Header(name)` — a single request header.
- `@Req()` — the raw Bun `Request` (with `params` attached).
- `@Ctx()` — the full `RequestContext` (`req`, `url`, `params`, `query`, `headers`, `state`, `responseHeaders`, and more).

```ts
import { Controller, Get, Header, Param, Query } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get(":id")
  findOne(@Param("id") id: string, @Header("x-trace") trace?: string) {
    return { id, trace };
  }

  @Get()
  search(@Query("q") q?: string) {
    return { q };
  }
}
```

## Validation with Zod

Pass a Zod schema to `@Body`, `@Query`, or `@Param`. The incoming value is parsed and validated; the argument is the typed, validated result. Invalid input is rejected with `400` and a list of field errors.

```ts
import { Body, Controller, Post } from "@grupodiariodaregiao/bunstone";
import { z } from "zod";

const CreateUser = z.object({
  name: z.string().min(2),
  age: z.number(),
});

@Controller("users")
export class UsersController {
  @Post()
  create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
    return { created: body };
  }
}
```

A failed validation responds with a body shaped like:

```json
{ "statusCode": 400, "errors": [{ "field": "age", "message": "..." }] }
```

## Response headers

Add a static response header to a route with `@SetHeader(name, value)`.

```ts
import { Controller, Get, SetHeader } from "@grupodiariodaregiao/bunstone";

@Controller("feed")
export class FeedController {
  @Get("raw")
  @SetHeader("content-type", "application/xml")
  xml() {
    return "<ok/>";
  }
}
```

## Return values

The value a handler returns is serialized automatically:

- **object** → JSON response (`200`).
- **string** → `text/plain` response (`200`).
- **`null` / `undefined`** → empty `204 No Content`.
- **`Response`** → returned as-is (passthrough), with any `@SetHeader` values applied.
- **`ReadableStream` / `Blob`** → streamed as the response body.

```ts
@Get("download")
download() {
  return new Response("file contents", {
    headers: { "content-disposition": "attachment" },
  });
}
```

## Exceptions

Throw an `HttpException` (or one of its subclasses) to produce an error response with the matching status code. The message or object you pass becomes the response body.

```ts
import { Controller, Get, NotFoundException, Param } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    if (id !== "1") {
      throw new NotFoundException("User not found");
    }
    return { id };
  }
}
```

Built-in exceptions:

- `HttpException(response, status)` — the base class for a custom status.
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `ConflictException` (409)
- `UnprocessableEntityException` (422)
- `TooManyRequestsException` (429)
- `InternalServerErrorException` (500)

A string argument produces `{ "message": "..." }`; an object argument is used as the body verbatim.

## docs/guards-jwt.md

# Guards & JWT

Guards decide whether a request is allowed to reach a handler. Bunstone ships a general guard mechanism plus a ready-made JWT integration built on top of it.

## Guards

A guard is a provider that implements `GuardContract`. Its `canActivate` method receives the `RequestContext` and returns `true` to allow the request or `false` (or throws) to reject it. Because guards are providers, they can inject other services through their constructor.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";
import type { GuardContract, RequestContext } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ApiKeyGuard implements GuardContract {
  canActivate(ctx: RequestContext): boolean {
    return ctx.headers.get("x-api-key") === "secret";
  }
}
```

Attach it with `@UseGuards`, on a single route or on the whole controller. Remember to register the guard in the module's `providers` so it can be resolved.

```ts
import { Controller, Get, UseGuards } from "@grupodiariodaregiao/bunstone";

@Controller("admin")
export class AdminController {
  @Get("secret")
  @UseGuards(ApiKeyGuard)
  secret() {
    return { secret: 42 };
  }
}

@Module({
  controllers: [AdminController],
  providers: [ApiKeyGuard],
})
export class AdminModule {}
```

When a guard returns `false`, the request is rejected with `403 Forbidden`. A guard may also throw an `HttpException` to control the exact status and body.

The `RequestContext` passed to `canActivate` exposes `headers`, `params`, `query`, `url`, `req`, and a mutable `state` object that guards can use to pass data to the handler.

## JWT

### Setup

`JwtModule.register(...)` returns a global dynamic module, so `JwtService` and the JWT guard are available application-wide once it is imported into the root module.

```ts
import { JwtModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    JwtModule.register({
      secret: "your-secret-key",
      expiresIn: "1h",
      issuer: "my-app",
      audience: "my-clients",
    }),
  ],
})
export class AppModule {}
```

Only `secret` is required. `expiresIn`, `issuer`, and `audience` are optional and, when set, are applied to signing and enforced during verification.

### JwtService

Inject `JwtService` to sign, verify, and decode tokens.

```ts
import { Injectable, JwtService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(userId: string) {
    return this.jwt.sign({ sub: userId, role: "admin" });
  }

  async check(token: string) {
    const payload = await this.jwt.verify<{ sub: string }>(token);
    return payload?.sub ?? null;
  }
}
```

- `sign(payload, overrides?)` — returns a signed token. `overrides` can replace `expiresIn`, `issuer`, or `audience` for a single call.
- `verify<T>(token)` — returns the decoded payload, or `null` if the token is invalid, tampered with, or expired.
- `decode<T>(token)` — decodes the payload **without** verifying the signature.

The module's configuration is available under the `JWT_OPTIONS` token, and `JwtGuard` is a normal provider you can list in `@UseGuards(JwtGuard)` if you prefer that over `@Jwt()`.

### Protecting routes

`@Jwt()` is a built-in guard. It reads the `Authorization: Bearer <token>` header, verifies it with `JwtService`, and stores the payload on `ctx.state.jwt`. A missing or invalid token results in `401 Unauthorized`.

`@JwtPayload()` is a parameter decorator that reads that stored payload into a handler argument.

```ts
import { Controller, Get, Jwt, JwtPayload } from "@grupodiariodaregiao/bunstone";

@Controller("me")
export class MeController {
  @Get()
  @Jwt()
  profile(@JwtPayload() payload: { sub: string }) {
    return { sub: payload.sub };
  }
}
```

`@Jwt()` composes cleanly with other guards — stack it alongside `@UseGuards(RoleGuard)` to require both a valid token and a custom check. Guard decorators applied to the same class are merged, so every one of them runs:

```ts
@UseGuards(RoleGuard)
@Jwt()
@Controller("admin")
export class AdminController {}   // both guards enforced
```

Class-level guards are also **inherited**: a controller that extends a guarded base class keeps the base's guards, so extending a protected controller cannot accidentally open it up.

## docs/uploads-and-static.md

# File uploads & static files

## Uploads

`@FormData()` parses a `multipart/form-data` request into text fields and files. The files are standard web `File` objects, so Bun's file APIs work on them directly.

```ts
import { Controller, FormData, Post } from "@grupodiariodaregiao/bunstone";
import type { FormDataPayload } from "@grupodiariodaregiao/bunstone";

@Controller("uploads")
export class UploadsController {
  @Post()
  async upload(@FormData() form: FormDataPayload) {
    for (const file of form.files) {
      await Bun.write(`./storage/${file.name}`, file);
    }
    return { title: form.fields.title, count: form.files.length };
  }
}
```

```ts
interface FormDataPayload {
  fields: Record<string, string>;  // every non-file field, as text
  files: File[];                   // every file part
}
```

A request that is not valid multipart is rejected with `400 Expected multipart form data.` before your handler runs.

Each `File` carries `name`, `type` and `size`, so you can enforce your own limits:

```ts
@Post()
async upload(@FormData() form: FormDataPayload) {
  const [file] = form.files;
  if (!file) throw new BadRequestException("A file is required.");
  if (file.size > 5_000_000) throw new BadRequestException("File too large.");
  if (!file.type.startsWith("image/")) {
    throw new UnprocessableEntityException("Only images are accepted.");
  }
  await Bun.write(`./storage/${crypto.randomUUID()}`, file);
  return { ok: true };
}
```

## Static files

Serve a directory from disk with the `static` option:

```ts
const app = await Application.create(AppModule, {
  static: { dir: "./public", prefix: "/public" },
});
```

- `dir` — the directory to serve, resolved from the process working directory. Default `public`.
- `prefix` — the URL prefix it is mounted on. Default `/public`.

`GET /public/logo.png` serves `./public/logo.png`. A missing file is `404`; a malformed percent-escape is `400`.

Static files are resolved **after** your controllers, so a route always wins over a file on the same path.

### Path traversal

Requests that try to escape the served directory are rejected with `403`, including encoded variants:

```
/public/../secret.txt      → 403
/public/..%2fsecret.txt    → 403
/public/%2e%2e/secret.txt  → 403
/public/sub/../../etc      → 403
```

The check resolves the final absolute path and requires it to sit inside the served directory, so it holds regardless of how the traversal is spelled.

## Request state

Guards and handlers share a per-request `state` object, which is how a guard passes data to the handler it protected. `@State()` reads it.

```ts
@Injectable()
export class TenantGuard implements GuardContract {
  canActivate(ctx: RequestContext): boolean {
    const tenant = ctx.headers.get("x-tenant");
    if (!tenant) return false;
    ctx.state.tenant = tenant;
    return true;
  }
}

@Controller("reports")
export class ReportsController {
  @Get()
  @UseGuards(TenantGuard)
  list(@State("tenant") tenant: string) {
    return { tenant };
  }
}
```

`@State()` without a key returns the whole state object. State is allocated fresh per request and never shared between them. `@Jwt()` uses exactly this mechanism — it stores the verified payload on `ctx.state.jwt`, which is what `@JwtPayload()` reads.

## docs/database.md

# Database (SQL)

Bunstone wraps [Bun's native SQL client](https://bun.sh/docs/api/sql) in a small, injectable service. Register the module once and inject `SqlService` anywhere.

`SqlModule` is a **global** module: registering it in your root module makes `SqlService` available everywhere without re-importing.

## Registration

`SqlModule.register()` accepts either a connection-options object or a connection URL. Any relational database Bun.SQL supports works — `postgres`, `mysql`, `mariadb`, or `sqlite`.

```ts
import { Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { UsersRepository } from "./users.repository";

@Module({
  imports: [
    SqlModule.register({
      adapter: "mysql",
      hostname: "localhost",
      port: 3306,
      username: "root",
      password: "secret",
      database: "app",
    }),
  ],
  providers: [UsersRepository],
})
export class AppModule {}
```

Or with a URL:

```ts
SqlModule.register("mysql://root:secret@localhost:3306/app");
```

### Options

| Option | Type | Description |
|---|---|---|
| `adapter` | `"postgres" \| "mysql" \| "mariadb" \| "sqlite"` | Database driver |
| `hostname` | `string` | Host |
| `port` | `number` | Port |
| `username` | `string` | User |
| `password` | `string` | Password |
| `database` | `string` | Database name |
| `filename` | `string` | SQLite file (e.g. `:memory:`) |
| `timezone` | `string` | Session timezone (default `"utc"`) |
| `max` | `number` | Max pool connections |
| `idleTimeout` | `number` | Idle connection timeout |
| `maxLifetime` | `number` | Max connection lifetime |
| `connectionTimeout` | `number` | Connection timeout |

The connection pool is closed automatically on application shutdown.

## SqlService

Inject `SqlService` into any provider or controller.

```ts
import { Injectable, SqlService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersRepository {
  constructor(private readonly sql: SqlService) {}

  create(name: string, age: number) {
    return this.sql.query("INSERT INTO users (name, age) VALUES (?, ?)", [name, age]);
  }

  findByName(name: string) {
    return this.sql.queryOne<{ id: number; name: string; age: number }>(
      "SELECT * FROM users WHERE name = ?",
      [name],
    );
  }
}
```

### Methods

- `query<T>(sql, params?)` — runs a statement and returns `T[]`.
- `queryOne<T>(sql, params?)` — returns the first row as `T`, or `null` when nothing matches.
- `transaction(fn)` — runs `fn` inside a transaction, committing on success and rolling back if it throws. The callback receives a transaction client whose `.unsafe(sql, params)` runs statements on the same transaction.
- `client` — the underlying `Bun.SQL` instance for advanced use.

### Raw client access

`SqlService.client` is the underlying `Bun.SQL` instance. The same object is registered under the `SQL_CLIENT` token, so you can inject it directly when you want the driver without the wrapper:

```ts
import { Inject, Injectable, SQL_CLIENT } from "@grupodiariodaregiao/bunstone";
import type { SQL } from "bun";

@Injectable()
export class Reports {
  constructor(@Inject(SQL_CLIENT) private readonly sql: SQL) {}
}
```

### Parameterized queries

Bind values with placeholders instead of string interpolation to stay safe from injection. MySQL, MariaDB, and SQLite use `?`:

```ts
await this.sql.query("SELECT * FROM users WHERE age > ?", [18]);
```

Postgres uses numbered placeholders (`$1`, `$2`, ...):

```ts
await this.sql.query("SELECT * FROM users WHERE age > $1", [18]);
```

### Transactions

```ts
await this.sql.transaction(async (tx) => {
  await tx.unsafe("INSERT INTO users (name, age) VALUES (?, ?)", ["ada", 36]);
  await tx.unsafe("INSERT INTO logs (message) VALUES (?)", ["user created"]);
});
```

If the callback throws, the whole transaction is rolled back.

## docs/cache.md

# Cache

`CacheModule` provides a Redis-backed cache using **Bun's native Redis client**
(works with Redis and Valkey). Register it once, then inject `CacheService`.

## Setup

```ts
import { CacheModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CacheModule.register({ url: "redis://localhost:6379" })],
})
export class AppModule {}
```

If `url` is omitted, the client reads `REDIS_URL` / `VALKEY_URL`, falling back to
`redis://localhost:6379`. The connection is closed automatically on shutdown.

## Usage

`CacheService` serializes values as JSON.

```ts
import { CacheService, Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersService {
  constructor(private readonly cache: CacheService) {}

  async getUser(id: string) {
    return this.cache.getOrSet(
      `user:${id}`,
      () => this.loadFromDb(id),
      { ttlSeconds: 60 },
    );
  }

  private loadFromDb(id: string) {
    return { id, name: "Ada" };
  }
}
```

## Raw client access

`CacheService.client` is the underlying Bun `RedisClient`, also registered under the `CACHE_CLIENT` token for direct injection when you need a command the service does not wrap:

```ts
import { CACHE_CLIENT, Inject, Injectable } from "@grupodiariodaregiao/bunstone";
import type { RedisClient } from "bun";

@Injectable()
export class Leaderboard {
  constructor(@Inject(CACHE_CLIENT) private readonly redis: RedisClient) {}
}
```

## API

- `get<T>(key)` — returns the parsed value or `null`.
- `set(key, value, { ttlSeconds? })` — stores a JSON value, optionally with a TTL.
- `has(key)` — `true` if the key exists.
- `delete(key)` — removes a key.
- `getOrSet<T>(key, factory, { ttlSeconds? })` — returns the cached value, or
  computes it with `factory`, caches it, and returns it.
- `client` — the underlying Bun `RedisClient` for advanced commands.

## docs/cqrs.md

# CQRS

Bunstone provides Command, Query, and Event buses that route messages to their handlers. `CqrsModule` is a **global** module — register it once and the three buses are injectable everywhere.

## Registration

```ts
import { Module, CqrsModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CqrsModule.register()],
  providers: [CreateUserHandler, GetUserHandler, UserCreatedHandler],
})
export class AppModule {}
```

Handlers are ordinary providers: define them, then list them in the module's `providers`. Bunstone wires each handler to its bus automatically based on the decorator.

## Commands

Commands change state. A command is a plain class; its handler implements `ICommandHandler` and is annotated with `@CommandHandler(Command)`.

```ts
import { Injectable, CommandBus, CommandHandler } from "@grupodiariodaregiao/bunstone";
import type { ICommandHandler } from "@grupodiariodaregiao/bunstone";

export class CreateUser {
  constructor(readonly name: string) {}
}

@CommandHandler(CreateUser)
@Injectable()
export class CreateUserHandler implements ICommandHandler<CreateUser, { id: string }> {
  execute(command: CreateUser) {
    return { id: `id-${command.name}` };
  }
}
```

Dispatch through the `CommandBus`:

```ts
@Injectable()
export class UsersService {
  constructor(private readonly commandBus: CommandBus) {}

  create(name: string) {
    return this.commandBus.execute<{ id: string }>(new CreateUser(name));
  }
}
```

Executing a command with no registered handler throws.

## Queries

Queries read state without changing it. A handler implements `IQueryHandler` and is annotated with `@QueryHandler(Query)`.

```ts
import { QueryHandler } from "@grupodiariodaregiao/bunstone";
import type { IQueryHandler } from "@grupodiariodaregiao/bunstone";

export class GetUser {
  constructor(readonly id: string) {}
}

@QueryHandler(GetUser)
@Injectable()
export class GetUserHandler implements IQueryHandler<GetUser, { id: string }> {
  execute(query: GetUser) {
    return { id: query.id };
  }
}
```

```ts
const user = await this.queryBus.execute<{ id: string }>(new GetUser("7"));
```

## Events

Events notify the system that something happened. An event can have any number of handlers; each implements `IEventHandler` (note the `handle` method) and is annotated with `@EventHandler(Event)`.

```ts
import { EventHandler } from "@grupodiariodaregiao/bunstone";
import type { IEventHandler } from "@grupodiariodaregiao/bunstone";

export class UserCreated {
  constructor(readonly name: string) {}
}

@EventHandler(UserCreated)
@Injectable()
export class SendWelcome implements IEventHandler<UserCreated> {
  handle(event: UserCreated) {
    console.log(`welcome ${event.name}`);
  }
}
```

Publish through the `EventBus`:

```ts
this.eventBus.publish(new UserCreated("ada"));      // fire and forget
await this.eventBus.publishAndWait(new UserCreated("ada")); // await all handlers
```

Every handler registered for an event runs. Handlers are **isolated**: if one throws, the error is logged and the remaining handlers still run.

## docs/event-sourcing.md

# Event Sourcing

Bunstone ships an event-sourcing layer built on top of the SQL module: an `AggregateRoot` base class, an append-only `EventStore` (`SqlEventStore`) with optimistic concurrency and snapshots, and an `EventSourcedRepository` that rebuilds aggregates by replaying their events.

## Registration

`EventSourcingModule` needs `SqlModule` to be registered too. Both are global.

```ts
import { Module, SqlModule, EventSourcingModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    SqlModule.register({
      adapter: "mysql",
      hostname: "localhost",
      port: 3306,
      username: "root",
      password: "secret",
      database: "app",
    }),
    EventSourcingModule.register(),
  ],
})
export class AppModule {}
```

On startup the store creates two tables if they do not exist: `events` (composite primary key `stream_id + version`) and `snapshots`.

The store adapts its bind-parameter style to the configured adapter, so the same code works on PostgreSQL (`$1, $2, …`) as on MySQL, MariaDB and SQLite (`?`).

## Aggregates

Extend `AggregateRoot`. Mutations call the protected `apply(event)`, which invokes your `when(event)` reducer, records the event as uncommitted, and bumps the version. Domain events are plain objects carrying a `type` field.

```ts
import { AggregateRoot } from "@grupodiariodaregiao/bunstone";

interface Deposited { type: "Deposited"; amount: number }
interface Withdrawn { type: "Withdrawn"; amount: number }
type AccountEvent = Deposited | Withdrawn;

export class Account extends AggregateRoot {
  balance = 0;

  deposit(amount: number) {
    this.apply({ type: "Deposited", amount } satisfies Deposited);
  }

  withdraw(amount: number) {
    if (amount > this.balance) throw new Error("insufficient funds");
    this.apply({ type: "Withdrawn", amount } satisfies Withdrawn);
  }

  protected when(event: object): void {
    const e = event as AccountEvent;
    if (e.type === "Deposited") this.balance += e.amount;
    if (e.type === "Withdrawn") this.balance -= e.amount;
  }
}
```

`AggregateRoot` exposes:

- `apply(event)` — protected; apply and record a new event.
- `when(event)` — abstract; your reducer that mutates state from an event.
- `loadFromHistory(events)` — replay past events to rebuild state (does not mark them uncommitted).
- `commit(count?)` — drop the events that were persisted. `EventSourcedRepository` passes the number it appended, so an event applied while the append was in flight stays pending for the next save instead of being lost.
- `version` — number of events applied.
- `uncommittedEvents` — events applied since the last commit.

## Repository

`EventSourcedRepository` takes the store and a factory for empty aggregates. Resolve the store with the `EVENT_STORE` token.

```ts
import { EventSourcedRepository, EVENT_STORE } from "@grupodiariodaregiao/bunstone";
import type { EventStore } from "@grupodiariodaregiao/bunstone";

const store = app.resolve<EventStore>(EVENT_STORE);
const accounts = new EventSourcedRepository(store, () => new Account());

const account = new Account();
account.deposit(100);
account.withdraw(30);
await accounts.save("acc-1", account);

const rebuilt = await accounts.load("acc-1");
console.log(rebuilt?.balance); // 70
console.log(rebuilt?.version); // 2
```

- `save(streamId, aggregate)` — appends the aggregate's uncommitted events (at its expected version) and commits. A no-op when there is nothing uncommitted.
- `load(streamId)` — reads the stream and replays it into a fresh aggregate; returns `null` if the stream has no events.

## Event store

`SqlEventStore` implements the `EventStore` interface:

- `append(streamId, events, expectedVersion)` — appends events in a transaction. If the stream's current version differs from `expectedVersion`, it throws `EventStoreError` (optimistic concurrency, ultimately enforced by the composite primary key). A conflict that only surfaces at insert time — two writers racing past the version check — is mapped to the same typed error, so `catch (e) { if (e instanceof EventStoreError) retry() }` covers both paths.
- `read(streamId)` — returns the ordered event records.
- `saveSnapshot(snapshot)` / `loadSnapshot(streamId)` — store and retrieve a `{ streamId, version, state }` snapshot.

> **Note:** snapshots are storage only. `EventSourcedRepository.load` always replays the full stream and does not consult them — take and read them yourself if you need to shorten a long replay.

```ts
await store.saveSnapshot({ streamId: "acc-1", version: 3, state: { balance: 70 } });
const snapshot = await store.loadSnapshot<{ balance: number }>("acc-1");
```

## docs/messaging.md

# Messaging (RabbitMQ)

Bunstone integrates with RabbitMQ (AMQP 0-9-1) through a global `RabbitMQModule`. Consumers are declared with decorators; publishing goes through `RabbitMQService`. Delivery is resilient by default: successful handlers auto-ack, failing handlers auto-retry with backoff and finally dead-letter.

## Installation

RabbitMQ support requires the `amqplib` driver:

```bash
bun add amqplib
```

## Registration

```ts
import { Module, RabbitMQModule } from "@grupodiariodaregiao/bunstone";
import { OrderConsumer } from "./order.consumer";

@Module({
  imports: [
    RabbitMQModule.register({
      uri: "amqp://guest:guest@localhost:5672",
      prefetch: 10,
      exchanges: [{ name: "events", type: "topic", durable: true }],
      queues: [
        {
          name: "orders.created",
          durable: true,
          bindings: [{ exchange: "events", routingKey: "orders.created" }],
          deadLetterQueue: "orders.created.dlq",
        },
        { name: "orders.created.dlq" },
      ],
      retry: { maxAttempts: 3, baseDelayMs: 200 },
    }),
  ],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### Options

- `uri` — AMQP connection string.
- `prefetch` — max unacknowledged messages per consumer, which is also the handler concurrency. Default `10`. Set `0` for unlimited (not recommended: the broker will push the whole queue at once).
- `reconnect` — `{ enabled?, delayMs?, maxRetries? }`. Reconnection is on by default (`delayMs` 2000 with ±20% jitter, `maxRetries` 0 = unlimited).
- `exchanges` — `{ name, type?, durable? }[]`. `type` defaults to `"topic"`, `durable` to `true`.
- `queues` — `{ name, durable?, bindings?, deadLetterQueue? }[]`. `bindings` is `{ exchange, routingKey }[]`. When `deadLetterQueue` is set, failed messages are routed there after retries are exhausted.
- `retry` — `{ maxAttempts?, baseDelayMs?, maxDelayMs?, factor? }`. Defaults: `maxAttempts` 3, `baseDelayMs` 200, `factor` 2, `maxDelayMs` 30000.
- `circuitBreaker` — `{ failureThreshold?, cooldownMs?, successThreshold? }`. Defaults: 5 failures to open, 10s cooldown, 1 success to close.

The resolved configuration is available under the `RABBIT_OPTIONS` token, and `RabbitConnection` is injectable — its `isHealthy()` reports whether the link is currently up.

## Consuming

A consumer is a class decorated with `@RabbitConsumer()`. Each `@RabbitSubscribe({ queue })` method receives a `RabbitMessage<T>` and is registered as a provider.

```ts
import { RabbitConsumer, RabbitSubscribe, Injectable } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
@Injectable()
export class OrderConsumer {
  @RabbitSubscribe({ queue: "orders.created" })
  async onOrderCreated(message: RabbitMessage<{ orderId: string }>) {
    console.log("new order", message.data.orderId, "attempt", message.attempt);
  }
}
```

`RabbitMessage<T>` carries:

- `data` — the JSON-decoded payload (typed as `T`).
- `raw` — the raw amqplib `ConsumeMessage`.
- `attempt` — the current delivery attempt (starts at 1).

### Auto-ack, retry, and dead-lettering

You do not ack manually. When the handler **resolves**, the message is acknowledged. When it **throws**:

1. If `attempt` is below `retry.maxAttempts`, the message is moved to a **retry queue** that holds it for the backoff delay (`baseDelayMs * factor^(attempt-1)`, capped at `maxDelayMs`) and then dead-letters it back into the original queue with the attempt counter incremented.
2. Once attempts are exhausted, the message is sent to the queue's `deadLetterQueue` if one is configured. Without one it is **rejected** rather than acknowledged, so the queue's own dead-letter route still applies and the payload is never destroyed by the framework. Configure a `deadLetterQueue` if you want failures kept somewhere you can inspect them.

The retry queues are declared for you, one per distinct delay, named `<queue>.retry.<delay>ms`. They carry `x-message-ttl` plus a dead-letter route back to the source queue, so **the backoff is broker state, not a timer in your process**.

The original message is acknowledged only after the broker confirms it has taken the copy. If the process dies in between, the message is still unacked and gets redelivered — nothing is lost.

When `deadLetterQueue` is set, the queue is also declared with a dead-letter route to it, so rejections the broker decides on its own — a queue TTL, a `max-length` overflow — end up in the DLQ instead of disappearing.

You can consume the dead-letter queue like any other queue by adding a `@RabbitSubscribe({ queue: "orders.created.dlq" })` handler.

### Restart safety

Stopping the app — a deploy, `SIGTERM`, a crash — and starting it again resumes exactly where it left off:

- **In-flight handlers** are drained on shutdown. Consumers are cancelled first so no new message is delivered, then the app waits for running handlers (up to `shutdownTimeoutMs`, default 10s) before closing the channels.
- **Messages waiting on a backoff** live in their retry queue on the broker. They come back on their own when the TTL expires, whether or not the app was running at the time.
- **Anything unacked** when the process died is redelivered by the broker on the next connection.

Delivery is at-least-once: a crash between a handler's side effect and its ack means the message is delivered again. Handlers should be idempotent.

### Circuit breaker

Each subscription is wrapped in its own **circuit breaker**. After repeated failures it opens and **pauses consumption of that queue** for the cooldown — the consumer is cancelled and messages stay on the broker instead of burning through their retries against a dependency that is down. When the cooldown elapses the consumer re-registers and the next message decides whether the circuit closes or opens again. Defaults: 5 failures to open, 10s cooldown, 1 success to close.

Because each subscription has its own breaker and its own channel, one misbehaving consumer never affects the others.

`CircuitBreaker` is exported and usable on its own for any call you want to protect — an outbound HTTP dependency, for example:

```ts
import { CircuitBreaker, CircuitOpenError } from "@grupodiariodaregiao/bunstone";

const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 5000 });

try {
  const result = await breaker.execute(() => fetch(url));
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // short-circuited: the dependency is known to be down
  }
}
```

The retry helpers (`backoffDelay`, `shouldRetry`, `DEFAULT_RETRY`) and the topology helpers (`retryQueueName`, `retryDelays`) are exported too, which is what the module itself uses to derive queue names.

### Reconnection

Each consumer runs on its own channel, and both connection-level and channel-level failures trigger a full re-establish: the module reconnects and **re-registers all consumers and topology** (exchanges, queues, bindings, retry queues), so subscriptions resume without manual intervention. Reconnect attempts are jittered to avoid a stampede when many replicas restart at once.

`RabbitConnection` exposes `isHealthy()`, reporting whether the link is currently up.

Be deliberate about where you use it. Under an orchestrator that **restarts** unhealthy containers — a Docker Swarm `healthcheck`, for instance — pointing the check at broker connectivity turns a broker outage into a restart loop across every replica, and restarting does not bring the broker back. The built-in reconnect already handles the outage, so keep the container healthcheck on `/health` and let the app stay up while it retries.

Wire `isHealthy()` in only where "not ready" means *stop sending me traffic* rather than *kill me* — for example a readiness endpoint an external load balancer polls:

```ts
const app = await Application.create(AppModule, {
  health: {
    checks: [() => rabbitConnection.isHealthy()],
  },
});
```

## Publishing

Inject `RabbitMQService` to publish. Messages are JSON-encoded and `persistent` by default.

```ts
import { Injectable, RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(orderId: string) {
    await this.rabbit.publish("events", "orders.created", { orderId });
  }

  async notify(text: string) {
    await this.rabbit.sendToQueue("notifications", { text });
  }
}
```

- `publish(exchange, routingKey, message, options?)` — publish to an exchange.
- `sendToQueue(queue, message, options?)` — send straight to a queue.

Both publish on a **confirm channel** with `mandatory` set: the promise resolves only once the broker has acknowledged the message *and* confirmed it was routed somewhere. A publish to an exchange with no matching binding, or to a queue that does not exist, **rejects** — the broker acknowledges unroutable messages, so without this they would vanish while your `await` reported success.

Publishing while the broker is unreachable rejects after a timeout instead of hanging indefinitely, so an HTTP handler is never pinned for the length of an outage.

## docs/scheduling.md

# Scheduling

Bunstone runs periodic and delayed tasks with decorators on your providers. The scheduler starts jobs when the app boots and stops them on shutdown. Decorate methods on any `@Injectable` provider registered in a module's `providers`.

## @Cron

Runs a method on a cron schedule using native `Bun.cron`. Expressions are **5-field** (minute, hour, day-of-month, month, day-of-week) and evaluated in **UTC**.

```ts
import { Injectable, Cron } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ReportService {
  @Cron("*/5 * * * *")
  everyFiveMinutes() {
    console.log("running report");
  }
}
```

An invalid cron expression throws at startup.

## @Interval

Runs a method repeatedly every `ms` milliseconds.

```ts
import { Injectable, Interval } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class HealthCheck {
  @Interval(30_000)
  ping() {
    console.log("still alive");
  }
}
```

## @Timeout

Runs a method once, `ms` milliseconds after startup.

```ts
import { Injectable, Timeout } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class Warmup {
  @Timeout(5_000)
  prime() {
    console.log("warming caches");
  }
}
```

## Behavior

- **Stop on shutdown** — all cron jobs, intervals, and timeouts are cleared when the application closes.
- **Overlap guard** — a job will not start again while its previous run is still in progress; overlapping ticks are skipped.
- **Error isolation** — if a job throws, the error is logged and the failure does not affect other scheduled jobs.

## docs/realtime.md

# Realtime

Bunstone ships two realtime primitives: Server-Sent Events (SSE) for one-way server streaming, and WebSocket gateways for full-duplex messaging. Both integrate with the normal dependency injection container.

## Server-Sent Events

Add `@Sse()` to a controller `@Get()` method whose handler is an **async generator**. Each value you `yield` is an `SseMessage`; Bunstone streams them to the client as `text/event-stream` and automatically cleans up when the client disconnects.

```ts
import { Controller, Get, Sse, type SseMessage } from "@grupodiariodaregiao/bunstone";

@Controller("events")
export class EventsController {
  @Get()
  @Sse()
  async *stream(): AsyncGenerator<SseMessage> {
    yield { event: "tick", id: "1", data: { n: 1 } };
    yield { event: "tick", id: "2", data: { n: 2 } };
    yield { data: "done" };
  }
}
```

### SseMessage

```ts
interface SseMessage {
  data: unknown;      // string is sent as-is, anything else is JSON-stringified
  event?: string;     // event name
  id?: string;        // event id
  retry?: number;     // client reconnection delay in ms
}
```

### Heartbeats

Pass `heartbeatMs` to keep idle connections alive. Bunstone sends a comment ping (`: ping`) on that interval.

```ts
@Get("live")
@Sse({ heartbeatMs: 15_000 })
async *live(): AsyncGenerator<SseMessage> {
  let n = 0;
  while (true) {
    yield { data: { n: n++ } };
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

When the client disconnects, the request's `AbortSignal` fires, the heartbeat is cleared, the generator is finalized (its `finally` blocks run) and the stream closes. No manual cleanup is required.

### Backpressure

The stream is **pull-driven**: your generator is only advanced when the client is ready for the next message. A consumer that stops reading stops the producer, so streaming a large dataset to a slow or idle client cannot buffer the whole thing into memory.

Heartbeats are skipped while the consumer is behind, so they never pile up either.

### Headers

CORS headers, `@SetHeader` values and rate-limit headers are applied to SSE responses like any other route — a cross-origin `EventSource` works with the same `cors` configuration as the rest of your API.

### Field safety

`event` and `id` are collapsed to a single line before being written, so a value containing a newline cannot forge extra frame lines. This matters whenever an event name or id derives from user input.

## WebSocket Gateways

A gateway is an `@Injectable()` class decorated with `@WebSocketGateway(path)` that implements `WebSocketHandler`. Gateways use normal constructor injection, so you can pull in any provider.

```ts
import {
  Injectable,
  WebSocketGateway,
  type Socket,
  type WebSocketHandler,
} from "@grupodiariodaregiao/bunstone";

@Injectable()
class ClockService {
  stamp() {
    return "tick";
  }
}

@WebSocketGateway("/ws")
@Injectable()
export class EchoGateway implements WebSocketHandler {
  constructor(private readonly clock: ClockService) {}

  open(socket: Socket) {
    socket.send(JSON.stringify({ hello: true }));
  }

  message(socket: Socket, data: unknown) {
    socket.send(JSON.stringify({ echo: data, at: this.clock.stamp() }));
  }
}
```

### WebSocketHandler

```ts
interface WebSocketHandler {
  open?(socket: Socket): void | Promise<void>;
  message(socket: Socket, data: unknown): void | Promise<void>;
  close?(socket: Socket, code: number, reason: string): void | Promise<void>;
}
```

Only `message` is required. Incoming text is parsed as JSON when possible; otherwise `data` is the raw string. Send data back with `socket.send(...)`.

A handler that throws (or rejects) is caught and logged per event, the way scheduled jobs are, so one bad message cannot take down the gateway or disappear without a trace.

### Registration

Register the gateway class (and its dependencies) in a module's `providers`. Bunstone discovers gateways during startup and wires the upgrade route for its path.

```ts
import { Module } from "@grupodiariodaregiao/bunstone";

@Module({ providers: [ClockService, EchoGateway] })
export class AppModule {}
```

Clients then connect to `ws://<host>/ws`.

## docs/rate-limiting.md

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
  keyGenerator?: (ctx) => string; // custom bucket key (default: IP + method + path)
}
```

By default each request is keyed by `IP:METHOD:ROUTE`, where `ROUTE` is the route **template** (`/users/:id`) rather than the concrete path. This matters: keying on the concrete path would let a caller mint a fresh bucket for every value of `:id` and never hit the limit at all.

Override `keyGenerator` to key by something else, e.g. an authenticated user id:

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

## docs/logging.md

# Logging

Bunstone ships a small structured logger. The framework uses it internally (startup, scheduled jobs, queue consumers, reconnections) and you can use the same class in your own providers.

## Usage

Give each logger a name so lines can be traced back to their source.

```ts
import { Injectable, Logger } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger("Orders");

  place(orderId: string) {
    this.logger.info("placing order", { orderId });
  }
}
```

## Levels

```ts
enum LogLevel {
  DEBUG = 0,
  INFO  = 1,
  WARN  = 2,
  ERROR = 3,
  FATAL = 4,
}
```

Methods: `debug`, `info`, `log` (an alias of `info`), `warn`, `error`, `fatal`. Anything below the configured level is dropped.

## Options

```ts
new Logger("Orders", {
  level: LogLevel.DEBUG,   // minimum level to emit (default INFO)
  timestamp: true,         // include an ISO timestamp
  pretty: false,           // human-readable with colours, or JSON
});
```

`pretty` defaults to whether stdout is a TTY: colourised output in a terminal, and single-line JSON when the process is piped or running in a container, which is what a log shipper wants.

## Structured output

In JSON mode each line is one object:

```json
{"timestamp":"2026-07-25T18:43:47.807Z","level":"INFO","name":"Orders","message":"placing order {\"orderId\":\"o-1\"}"}
```

Errors keep their identity instead of collapsing to `{}`:

```ts
logger.error("failed", new Error("boom", { cause: new Error("root cause") }));
```

```json
{"level":"ERROR","name":"Orders","message":"failed {\"name\":\"Error\",\"message\":\"boom\",\"stack\":\"...\",\"cause\":{\"name\":\"Error\",\"message\":\"root cause\",\"stack\":\"...\"}}"}
```

Serialization is cycle-safe: an object that references itself logs `"[Circular]"` rather than throwing. A log statement can never crash the code path it was there to diagnose.

## Trace correlation

When [`TelemetryModule`](./observability.md) is registered and a span is active, every line automatically carries `trace_id` and `span_id`, so a log can be opened directly against its trace in Grafana, Jaeger or any OTLP backend. No configuration is required — it works as soon as telemetry is on, and adds nothing when it is off.

## docs/observability.md

# Observability (OpenTelemetry)

Bunstone has built-in OpenTelemetry instrumentation. Register `TelemetryModule` and every HTTP request is automatically traced and measured — no manual instrumentation needed. When the module is not registered, instrumentation is a no-op with near-zero overhead.

## Setup

Import `TelemetryModule.register(...)` in your root module. Add it first so the SDK is ready before any request is handled.

```ts
import { Module, TelemetryModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    TelemetryModule.register({
      serviceName: "orders-api",
      serviceVersion: "1.2.0",
      environment: "production",
      otlpEndpoint: "http://localhost:4318",
    }),
  ],
})
export class AppModule {}
```

Start the app as usual — telemetry begins immediately.

## What gets instrumented

Every HTTP request produces:

- A span named `{METHOD} {route}` (e.g. `GET /users/:id`) with `http.request.method`, `http.route`, and `http.response.status_code`. Responses with status `>= 500` are marked as error spans.
- A `http.server.request.duration` histogram (milliseconds), tagged with method and route.

## Options

```ts
interface TelemetryOptions {
  serviceName: string;            // required, attached to all traces and metrics
  serviceVersion?: string;        // default "0.0.0"
  environment?: string;           // default "development"
  otlpEndpoint?: string;          // OTLP HTTP base URL; falls back to OTEL_EXPORTER_OTLP_ENDPOINT
  traces?: boolean;               // default true
  metrics?: boolean;              // default true
  console?: boolean;              // also print spans/metrics to stdout, default false
  metricIntervalMillis?: number;  // metric export interval, default 60000
}
```

Traces are exported to `{otlpEndpoint}/v1/traces` and metrics to `{otlpEndpoint}/v1/metrics`. If `otlpEndpoint` is omitted, Bunstone reads the standard `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Exporting to a backend

The OTLP HTTP exporter works with any OTLP-compatible backend — Jaeger, Grafana Tempo/LGTM, or any OpenTelemetry Collector.

The quickest local stack is the free `grafana/otel-lgtm` image, which bundles Loki, Grafana, Tempo, and Prometheus with an OTLP endpoint on port 4318:

```bash
docker run -p 3000:3000 -p 4318:4318 grafana/otel-lgtm
```

```ts
TelemetryModule.register({
  serviceName: "orders-api",
  otlpEndpoint: "http://localhost:4318",
})
```

Open Grafana at http://localhost:3000 to explore the traces and metrics.

## Local console output

For quick local debugging without a backend, print spans and metrics to stdout:

```ts
TelemetryModule.register({
  serviceName: "orders-api",
  console: true,
  metricIntervalMillis: 10_000,
})
```

## Direct access

`TelemetryService` is injectable, and the resolved configuration is registered under the `TELEMETRY_OPTIONS` token. `TelemetrySdk` is the lower-level object that owns the tracer and meter providers, if you need to reach them.

## Log correlation

The built-in `Logger` automatically includes `trace_id` and `span_id` whenever a span is active for the current request, so log lines can be correlated with their trace in your backend. No configuration is required — it works as soon as `TelemetryModule` is registered.

## Shutdown

`TelemetryModule` registers an `onModuleDestroy` hook that flushes all pending spans and metrics when the application closes, so nothing is lost on graceful shutdown.

Only the SDK's own providers are shut down — the OpenTelemetry API globals are left intact. That means a process that creates a second `Application` after closing the first (integration test suites, hot-reload supervisors) keeps exporting traces and metrics normally.

## docs/errors.md

# Errors

Bunstone throws typed errors with a stable code and, where possible, a suggestion telling you how to fix the problem. They are for *framework* failures — misconfiguration, a broken dependency graph, a queue that cannot be reached. For HTTP responses use [`HttpException` and its subclasses](./controllers.md#exceptions) instead.

## The base class

Every framework error extends `BunstoneError`:

```ts
abstract class BunstoneError extends Error {
  readonly code: string;                          // e.g. "BNS-DI-003"
  readonly suggestion?: string;                   // how to fix it
  readonly context?: Record<string, unknown>;     // the offending token, module, queue…
  readonly cause?: Error;                         // the original error, when wrapping one
}
```

`instanceof` works correctly for every subclass, and `cause` chains are preserved, so a wrapped driver error is still reachable.

```ts
import { BunstoneError, DatabaseError } from "@grupodiariodaregiao/bunstone";

try {
  await repository.save(order);
} catch (error) {
  if (error instanceof DatabaseError) {
    logger.error(`[${error.code}] ${error.message}`, error.cause);
  }
}
```

## Catching by area

| Class | Raised by |
|---|---|
| `DependencyResolutionError` | the DI container — unresolvable, circular or out-of-scope dependencies |
| `ModuleInitializationError` | `@Module` compilation — not a module, `undefined` entry |
| `ConfigurationError` | invalid or conflicting application options, duplicate routes |
| `DatabaseError` | the SQL layer |
| `EventStoreError` | the event store, including optimistic-concurrency conflicts |
| `CqrsError` | command/query/event buses — missing or duplicate handlers |
| `RabbitMQError` | connection, topology and consumer failures |
| `ScheduleError` | invalid cron expressions and scheduler failures |
| `RateLimitError` | rate-limit storage failures |
| `GuardError` | guard resolution failures |
| `HttpParamError` | parameter extraction and validation |
| `UploadError` | multipart handling |
| `TestingError` | the testing module |
| `ImportError`, `AdapterError`, `EmailError`, `BullMQError` | optional integrations |

## Error codes

Codes are stable and greppable — they are safe to alert on. The prefix identifies the area:

| Prefix | Area | Examples |
|---|---|---|
| `BNS-DI-*` | dependency injection | `BNS-DI-001` undefined type (usually `import type` on an injected class), `BNS-DI-002` circular dependency, `BNS-DI-003` no provider registered, `BNS-DI-004` outside the module's boundary |
| `BNS-MOD-*` | modules | `BNS-MOD-001` not a module, `BNS-MOD-002` `undefined` entry (usually a circular import) |
| `BNS-CFG-*` | configuration | `BNS-CFG-002` a feature used without registering its module |
| `BNS-HTTP-*` | routing | `BNS-HTTP-001` duplicate route, `BNS-HTTP-002` a built-in route collides with a controller |
| `BNS-DB-*`, `BNS-ES-*` | database, event store | connection, query and concurrency failures |
| `BNS-CQRS-*` | CQRS buses | missing or duplicate handler |
| `BNS-RMQ-*`, `BNS-MQ-*` | messaging | connection, topology and publish failures |
| `BNS-SCHED-*` | scheduling | invalid cron expression |
| `BNS-RL-*`, `BNS-GRD-*`, `BNS-TEST-*`, `BNS-IMP-*`, `BNS-ADP-*`, `BNS-EMAIL-*` | rate limiting, guards, testing, optional imports, adapters, email |

## Failing fast

Most of these are raised during `Application.create`, before the server accepts a single request: an unresolvable dependency, a duplicate route, an invalid cron expression or a module boundary violation stops the process at startup rather than surfacing on a rarely-hit endpoint later.

## docs/testing.md

# Testing

Bunstone's testing module compiles your DI graph, lets you swap providers for mocks, and dispatches HTTP requests **in-memory without binding a port**. The full pipeline — guards, validation, and dependency injection — runs exactly as in production.

## Creating a testing module

`Test.createTestingModule({ imports, controllers, providers })` returns a builder. Call `.compile()` to get a `TestingModule`.

```ts
import { describe, expect, it } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("Users", () => {
  it("resolves providers", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService],
    }).compile();

    expect(moduleRef.get(UsersService).findAll()).toEqual([
      { id: 1, name: "real" },
    ]);
  });
});
```

`moduleRef.get(Token)` resolves any provider from the container.

`compile()` builds the same object graph `Application.create` does, including the `onModuleInit` and `onApplicationBootstrap` hooks. It deliberately does **not** start the scheduler or connect to RabbitMQ, so tests never open a broker connection or leave timers running.

Call `await moduleRef.close()` when you are done: it runs the destroy hooks and stops any server `createTestApp()` created.

## Overriding providers

Swap a real provider for a mock with `.overrideProvider(Token).useValue(mock)` or `.useClass(Impl)`.

```ts
const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
})
  .overrideProvider(UsersService)
  .useValue({ findAll: () => [{ id: 99, name: "mock" }] })
  .compile();

expect(moduleRef.get(UsersService).findAll()).toEqual([
  { id: 99, name: "mock" },
]);
```

## In-memory HTTP requests

`moduleRef.createTestApp()` returns a `TestApp` that dispatches requests directly against your controllers — no server is bound to a port. Each method returns a real `Response`.

```ts
const moduleRef = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
}).compile();

const app = moduleRef.createTestApp();

const list = await app.get("/users");
expect(await list.json()).toEqual([{ id: 1, name: "real" }]);

const created = await app.post("/users", { name: "New User" });
expect(created.status).toBe(200);
```

### TestApp methods

```ts
app.get(path, { headers });
app.post(path, body, { headers });
app.put(path, body, { headers });
app.patch(path, body, { headers });
app.delete(path, { headers });
```

Bodies are JSON-encoded automatically. Every method returns a standard `Response`.

`TestApp` mirrors the real server's routing: routes are matched by specificity (a static segment wins over a `:param` regardless of declaration order), an unsupported method on a known path returns `405` with an `Allow` header, and an unknown path returns `404` — the same status codes and bodies `Bun.serve` produces.

## The full pipeline runs

Because requests go through the real route handler, validation and guards behave exactly as in production.

```ts
const app = moduleRef.createTestApp();

// Zod validation → 400 on bad input
expect((await app.post("/users", { name: "ok" })).status).toBe(200);
expect((await app.post("/users", { name: "x" })).status).toBe(400);

// Guards → 403 without the required header, 200 with it
expect((await app.get("/users/admin/secret")).status).toBe(403);
expect(
  (await app.get("/users/admin/secret", { headers: { "x-admin": "yes" } })).status,
).toBe(200);
```

## docs/openapi.md

# OpenAPI (Swagger)

Bunstone can generate an OpenAPI 3.1 document from your controllers and serve it, optionally alongside a Swagger UI page. Enrich the document with decorators.

## Enabling

Pass the `openapi` option to `Application.create`. The document is served at `/openapi.json`; set `ui: true` to also serve Swagger UI at `/docs`.

```ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
  },
});

app.listen(3000);
```

### Options

```ts
interface OpenApiServeOptions {
  info: { title: string; version: string; description?: string };
  ui?: boolean;      // serve Swagger UI (default: off)
  path?: string;     // spec path (default: "/openapi.json")
  uiPath?: string;   // UI path (default: "/docs")
  auth?: {
    username: string;
    password: string;
    realm?: string;
  };
}
```

### Protecting the docs

By default `/openapi.json` and `/docs` are public. Pass `auth` to require HTTP Basic Auth on both routes:

```ts
const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
    auth: {
      username: process.env.DOCS_USER ?? "admin",
      password: process.env.DOCS_PASSWORD ?? "secret",
    },
  },
});
```

Unauthenticated requests receive `401` with a `WWW-Authenticate: Basic` challenge (the browser shows a login prompt for `/docs`). The same credentials are required for `/openapi.json`, so the Swagger UI can load the spec after you sign in.

## Decorators

Annotate controllers and handlers to describe operations.

```ts
import { z } from "zod";
import { Controller, Get, Post, Body, Param, Query } from "@grupodiariodaregiao/bunstone";
import { ApiTags, ApiOperation, ApiResponse } from "@grupodiariodaregiao/bunstone";

const CreateUser = z.object({ name: z.string().min(2), age: z.number() });

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get(":id")
  @ApiOperation({ summary: "Get a user" })
  @ApiResponse({ status: 200, description: "found" })
  @ApiResponse({ status: 404, description: "missing" })
  one(@Param("id") id: string, @Query("expand") expand?: string) {
    return { id, expand };
  }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
    return body;
  }
}
```

- `@ApiTags(...tags)` — tags for a controller or a specific method; both are merged into the operation.
- `@ApiOperation({ summary, description })` — describes the endpoint.
- `@ApiResponse({ status, description })` — documents a response; repeat it for multiple statuses.

## Schemas from Zod

When you pass a Zod schema to `@Body(schema)`, Bunstone converts it with `z.toJSONSchema` and emits it as the operation's `requestBody` schema. Path parameters are documented automatically — including those declared on the `@Controller` prefix — and `@Query("name")` parameters appear as query parameters.

Some Zod types have no JSON Schema equivalent (`z.date()`, `z.bigint()`, `z.custom()`, `.transform()`). These are emitted as permissive schemas rather than failing: document generation can never stop your application from booting. When a schema cannot be represented, a warning naming the route is logged.

A self-referencing schema (a category with children of its own type, for example) is hoisted into `components.schemas` and referenced from there, so its internal `$ref` resolves to the schema rather than to the root of the document.

The Swagger UI page loads swagger-ui-dist from a CDN at an exact pinned version, locked with a subresource-integrity hash, so a compromised or altered CDN asset cannot execute on your API's origin.

For the controller above, the generated document includes:

```json
{
  "openapi": "3.1.0",
  "paths": {
    "/users/{id}": {
      "get": {
        "summary": "Get a user",
        "tags": ["Users"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "expand", "in": "query", "required": false, "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "found" }, "404": { "description": "missing" } }
      }
    },
    "/users": {
      "post": {
        "summary": "Create a user",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "number" } }, "required": ["name", "age"] } } }
        }
      }
    }
  }
}
```

## docs/cli.md

# CLI

Bunstone ships a CLI for scaffolding projects, running and building apps, generating boilerplate, and inspecting the public API. Invoke it with `bunx`:

```bash
bunx @grupodiariodaregiao/bunstone <command>
```

## Commands

### `bunstone new <name>`

Scaffolds a new project with `src/main.ts`, `src/app.module.ts`, and `src/app.controller.ts`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app && bun install && bun run dev
```

Scaffolding into a directory that already has files is refused, so a typo cannot overwrite an existing project. Pass `--force` to overwrite deliberately.

### `bunstone run <entry>`

Runs an entrypoint with Bun. Extra Bun flags are forwarded.

```bash
bunx @grupodiariodaregiao/bunstone run src/main.ts
bunx @grupodiariodaregiao/bunstone run --watch src/main.ts
```

### `bunstone build [entry]`

Bundles the app to `dist/` (targeting Bun, minified). Defaults to `src/main.ts` when no entry is given.

```bash
bunx @grupodiariodaregiao/bunstone build
bunx @grupodiariodaregiao/bunstone build src/main.ts
```

### `bunstone generate <kind> <name>` (alias `g`)

Generates a `controller`, `service`, or `module` from a template. The file name is derived in kebab-case and the class in PascalCase.

```bash
bunx @grupodiariodaregiao/bunstone generate controller users   # → users.controller.ts (UsersController)
bunx @grupodiariodaregiao/bunstone g service users             # → users.service.ts (UsersService)
bunx @grupodiariodaregiao/bunstone g module users              # → users.module.ts (UsersModule)
```

An existing file is never overwritten silently — the command refuses and tells you to re-run with `--force`. An unrecognised kind prints the usage line instead of failing with a stack trace.

### `bunstone exports`

Lists every public export from the package, one per line. Useful for confirming the exact name of a decorator, class, or type.

```bash
bunx @grupodiariodaregiao/bunstone exports
```

## docs/deployment.md

# Deployment: health checks & graceful shutdown

## Health & readiness endpoints

Enable built-in `/health` (liveness) and `/ready` (readiness) endpoints — useful
for Kubernetes probes and load balancers.

```ts
const app = await Application.create(AppModule, { health: true });
app.listen(3000);
```

- `GET /health` → always `200 { "status": "ok" }` while the process is up.
- `GET /ready` → `200 { "status": "ready" }` when the app is listening and not
  shutting down; `503 { "status": "not_ready" }` otherwise.

Add custom readiness checks (e.g. a dependency must be reachable). `/ready`
returns `503` if any check returns `false`:

```ts
await Application.create(AppModule, {
  health: {
    path: "/health",
    readyPath: "/ready",
    checks: [async () => sql.isConnected()],
  },
});
```

A check that *throws* counts as not ready — `/ready` answers `503`, never a `500`.

Mounting a controller on `/health`, `/ready`, `/openapi.json` or `/docs` while the matching built-in is enabled raises a configuration error at startup instead of silently replacing your route.

**Under Docker Swarm**, remember that an unhealthy container is *restarted*, not just removed from routing. Point the container `healthcheck` at `/health` and keep dependency probes (database, broker) out of it — restarting a container does not fix a broker that is down, and tying the two together turns an outage into a restart loop across every replica. Use `/ready` with dependency checks only where "not ready" means *stop sending traffic*, such as an external load balancer.

## Graceful shutdown

On `SIGINT`/`SIGTERM` (or `app.close()`), Bunstone shuts down cleanly:

1. `/ready` starts returning `503` so orchestrators stop routing new traffic.
2. In-flight HTTP requests are **drained** (allowed to finish).
3. `onModuleDestroy` hooks run; schedulers, queue consumers, the SQL pool and
   other resources are released.

```ts
await Application.create(AppModule, {
  health: true,
  shutdownGraceMs: 3000,     // wait before draining, so probes notice /ready=503
  shutdownTimeoutMs: 10000,  // force-close if draining exceeds this
});
```

- `shutdownGraceMs` — delay between marking the app not-ready and draining
  (gives the orchestrator time to stop sending traffic). Default `0`.
- `shutdownTimeoutMs` — maximum drain time before connections are force-closed
  (long-lived WebSocket connections are closed at this point). Default `10000`.

For zero-downtime rolling deploys, set `shutdownGraceMs` to a couple of seconds
and configure your orchestrator's `preStop` / termination grace period to match.
