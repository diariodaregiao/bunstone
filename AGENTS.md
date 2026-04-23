# Bunstone AGENTS Guide

This file is published with the `@grupodiariodaregiao/bunstone` package so coding agents can discover Bunstone's docs and examples directly inside `node_modules`.

## Package Paths

- Main package: `node_modules/@grupodiariodaregiao/bunstone`
- Markdown docs: `node_modules/@grupodiariodaregiao/bunstone/docs`
- Examples: `node_modules/@grupodiariodaregiao/bunstone/examples`
- Starter project: `node_modules/@grupodiariodaregiao/bunstone/starter`

## Recommended Commands

- Scaffold a new app: `bunx @grupodiariodaregiao/bunstone new my-app`
- Shorthand scaffold: `bunx @grupodiariodaregiao/bunstone my-app`
- Run an entrypoint with Bunstone CLI diagnostics: `bunstone run src/main.ts`
- Build an app for production: `bunstone build src/main.ts`
- List public exports: `bunstone exports`
- Run tests: `bun test`
- Run the local docs site: `bun run docs:dev`

## Public Runtime Exports

- `CacheAdapter`
- `UploadAdapter`
- `EmailModule`
- `EmailService`
- `EmailLayout`
- `AppStartup`
- `Layout`
- `Controller`
- `Get`
- `Post`
- `Put`
- `Patch`
- `Delete`
- `Head`
- `Options`
- `SetResponseHeader`
- `RateLimit`
- `RateLimitExceededException`
- `MemoryStorage`
- `RedisStorage`
- `CommandBus`
- `CqrsModule`
- `CommandHandler`
- `EventHandler`
- `QueryHandler`
- `Saga`
- `EventBus`
- `QueryBus`
- `SqlModule`
- `SqlService`
- `BullMqModule`
- `QueueService`
- `Processor`
- `Process`
- `RabbitMQModule`
- `RabbitMQService`
- `RabbitMQDeadLetterService`
- `RabbitMQConnection`
- `RabbitConsumer`
- `RabbitSubscribe`
- `BunstoneError`
- `DependencyResolutionError`
- `ModuleInitializationError`
- `ConfigurationError`
- `CqrsError`
- `DatabaseError`
- `BullMQError`
- `RabbitMQError`
- `ScheduleError`
- `TestingError`
- `RateLimitError`
- `UploadError`
- `EmailError`
- `HttpParamError`
- `GuardError`
- `AdapterError`
- `ImportError`
- `ErrorFormatter`
- `Guard`
- `HttpException`
- `BadRequestException`
- `UnauthorizedException`
- `ForbiddenException`
- `NotFoundException`
- `ConflictException`
- `UnprocessableEntityException`
- `InternalServerErrorException`
- `OkResponse`
- `CreatedResponse`
- `NoContentResponse`
- `Body`
- `Param`
- `Query`
- `Header`
- `Request`
- `FormData`
- `FormDataPayload`
- `Injectable`
- `Jwt`
- `JwtModule`
- `JwtService`
- `Module`
- `ApiTags`
- `ApiOperation`
- `ApiResponse`
- `ApiHeader`
- `ApiHeaders`
- `Render`
- `Cron`
- `Timeout`
- `Test`
- `TestingModule`
- `TestApp`
- `LogLevel`
- `Logger`

## Public Type-only Exports

- `DeadLetterDeathInfo`
- `DeadLetterMessage`
- `EmailConfig`
- `FormDataFields`
- `GuardContract`
- `HttpRequest`
- `LoggerOptions`
- `ModuleConfig`
- `OnModuleDestroy`
- `OnModuleInit`
- `Options`
- `RabbitMessage`
- `RabbitMQExchangeConfig`
- `RabbitMQModuleOptions`
- `RabbitMQQueueBinding`
- `RabbitMQQueueConfig`
- `RabbitMQReconnectConfig`
- `RabbitPublishOptions`
- `RabbitSubscribeOptions`
- `RateLimitConfig`
- `RateLimitHeaders`
- `RateLimitInfo`
- `RateLimitResult`
- `RateLimitStorage`
- `RequeueOptions`

## Bundled Markdown Docs

- `docs/index.md`
- `docs/getting-started.md`
- `docs/application-runtime.md`
- `docs/cli.md`
- `docs/dependency-injection.md`
- `docs/logging.md`
- `docs/routing-params.md`
- `docs/guards-jwt.md`
- `docs/cqrs.md`
- `docs/scheduling.md`
- `docs/database-sql.md`
- `docs/openapi.md`
- `docs/rate-limiting.md`
- `docs/mvc-ssr.md`
- `docs/testing.md`
- `docs/bullmq.md`
- `docs/rabbitmq.md`
- `docs/on-module-init.md`
- `docs/on-module-destroy.md`
- `docs/pt-BR/index.md`
- `docs/pt-BR/getting-started.md`
- `docs/pt-BR/application-runtime.md`
- `docs/pt-BR/cli.md`
- `docs/pt-BR/dependency-injection.md`
- `docs/pt-BR/logging.md`
- `docs/adapters/cache-adapter.md`
- `docs/adapters/email-adapter.md`
- `docs/adapters/form-data.md`
- `docs/adapters/upload-adapter.md`
- `docs/pt-BR/adapters/cache-adapter.md`
- `docs/pt-BR/adapters/email-adapter.md`
- `docs/pt-BR/adapters/form-data.md`
- `docs/pt-BR/adapters/upload-adapter.md`
- `docs/pt-BR/bullmq.md`
- `docs/pt-BR/cqrs.md`
- `docs/pt-BR/database-sql.md`
- `docs/pt-BR/guards-jwt.md`
- `docs/pt-BR/mvc-ssr.md`
- `docs/pt-BR/on-module-destroy.md`
- `docs/pt-BR/on-module-init.md`
- `docs/pt-BR/openapi.md`
- `docs/pt-BR/rabbitmq.md`
- `docs/pt-BR/rate-limiting.md`
- `docs/pt-BR/routing-params.md`
- `docs/pt-BR/scheduling.md`
- `docs/pt-BR/testing.md`

## Bundled Examples

- `examples/01-basic-app/index.ts`
- `examples/02-routing-params/index.ts`
- `examples/03-guards-auth/index.ts`
- `examples/04-cqrs/index.ts`
- `examples/05-database-sql/index.ts`
- `examples/06-scheduling/index.ts`
- `examples/07-adapters/index.ts`
- `examples/08-openapi/index.ts`
- `examples/08-ratelimit/index.ts`
- `examples/09-ssr/index.tsx`
- `examples/10-ssr-mvc/index.ts`
- `examples/11-email-adapter/index.ts`
- `examples/11-email-adapter/WelcomeEmail.tsx`
- `examples/12-bullmq/index.ts`
- `examples/13-rabbitmq/index.ts`
- `examples/package.json`
- `examples/10-ssr-mvc/src/views/Counter.tsx`
- `examples/10-ssr-mvc/src/views/HooksDemo.tsx`

## Full Documentation

## Source: `docs/index.md`

````md
---
layout: home

hero:
  name: Bunstone
  text: Decorator-based framework for Bun
  tagline: Build scalable and maintainable APIs with Elysia and Bun
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/diariodaregiao/bunstone

features:
  - title: Dependency Injection
    details: Powerful and recursive DI container for managing your services and controllers.
  - title: CQRS & Sagas
    details: Built-in support for Command, Query, and Event buses with reactive Sagas.
  - title: Decorator-based
    details: Clean and expressive syntax using TypeScript decorators, inspired by NestJS.
  - title: Fast & Lightweight
    details: Built on top of Bun and Elysia for maximum performance.
  - title: MVC & SSR
    details: Native React support for Server-Side Rendering with @Render decorator.
  - title: Professional Emails
    details: Send emails using React components and Tailwind CSS with automatic inline styling.
  - title: BullMQ
    details: Effortless background job processing with BullMQ integration.
  - title: RabbitMQ
    details: Full AMQP message broker integration with exchanges, queues, routing keys, dead letters and auto-reconnect.
  - title: Integrated Testing
    details: Optimized tools for integration and E2E testing with provider mocking and headless application support.
---
````

## Source: `docs/getting-started.md`

````md
# Getting Started

Bunstone is a decorator-based framework for Bun, inspired by NestJS. It provides a structured way to build scalable and maintainable APIs.

## Installation

You can scaffold a new project using our CLI:

```bash
bunx @grupodiariodaregiao/bunstone new my-app
# or shorthand
bunx @grupodiariodaregiao/bunstone my-app
```

### Alternatively: Use the Starter Template

You can also start by cloning the repository and using the `starter` directory:

```bash
git clone https://github.com/diariodaregiao/bunstone.git
cp -r bunstone/starter my-app
rm -rf bunstone
cd my-app
rm -rf .git
bun install
```

## Basic Setup

Bunstone projects follow a modular structure. Here's a basic setup:

### `src/main.ts`

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await AppStartup.create(AppModule);
  app.listen(3000);
}

bootstrap();
```

### `src/app.module.ts`

```typescript
import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./controllers/app.controller";

@Module({
  controllers: [AppController],
})
export class AppModule {}
```

## Running the App

```bash
bun dev
```

Your app will be running at `http://localhost:3000`.

## Full Example

Check out a complete standalone example of a basic application:

<<< @/../examples/01-basic-app/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/01-basic-app/index.ts)
````

## Source: `docs/application-runtime.md`

````md
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
````

## Source: `docs/cli.md`

````md
# CLI

Bunstone ships with a CLI focused on scaffolding, local development diagnostics, and production builds.

## Commands

### `bunstone new <project-name>`

Creates a new project from the bundled starter and runs `bun install`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
```

You can also use the shorthand:

```bash
bunx @grupodiariodaregiao/bunstone my-app
```

### `bunstone run [bun-flags] <entrypoint>`

Runs a Bun entrypoint and enhances import error messages with Bunstone export hints.

```bash
bunstone run src/main.ts
bunstone run --watch src/main.ts
```

Use this when you want Bun's normal runtime plus better diagnostics for invalid Bunstone imports.

### `bunstone build [entry] [options]`

Bundles the app entrypoint and, when available, bundles React views for SSR hydration.

```bash
bunstone build src/main.ts
```

#### Build options

- `--views <dir>`: directory containing React views. Default: `src/views`
- `--out <dir>`: build output directory. Default: `dist`
- `--compile`: compile to a standalone binary
- `--no-bundle`: skip the app bundle and only generate view bundles

Examples:

```bash
bunstone build src/main.ts --out build
bunstone build --compile
bunstone build --views src/views --no-bundle
```

If no entrypoint is provided, the CLI tries these files in order:

- `src/index.ts`
- `index.ts`
- `src/main.ts`
- `main.ts`

### `bunstone exports`

Prints public runtime exports and type-only exports from the package.

```bash
bunstone exports
```

Useful when:

- checking the correct name of a decorator or module
- confirming whether a symbol must be imported with `import type`
- debugging `Export named 'X' not found` errors

## Recommended Workflow

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app
bunstone run --watch src/main.ts
```

For production builds:

```bash
bunstone build src/main.ts --out dist
```
````

## Source: `docs/dependency-injection.md`

````md
# Dependency Injection

Bunstone uses a powerful Dependency Injection (DI) system that manages the lifecycle of your classes and their dependencies.

## @Injectable()

To make a class injectable, use the `@Injectable()` decorator.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DatabaseService {
  query(sql: string) {
    return `Executing: ${sql}`;
  }
}
```

## Constructor Injection

Dependencies are automatically resolved and injected via the constructor.

```typescript
@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  findAll() {
    return this.db.query("SELECT * FROM users");
  }
}
```

## Singleton Behavior

By default, all providers are singletons within their module tree. If multiple modules import the same module, they will share the same instances of exported providers.

## Module Merging

When you import a module into another, Bunstone merges the `injectables` to ensure that shared services (like a `CommandBus` or a `DatabaseConnection`) remain singletons across the entire application.

```typescript
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

@Module({
  imports: [SharedModule],
  controllers: [AppController],
})
export class AppModule {}
```

## Global Modules

Sometimes you may want a provider to be available everywhere without importing its module into every other module. You can achieve this by setting the `global` property to `true` in the `@Module` decorator.

```typescript
@Module({
  providers: [GlobalService],
  global: true,
})
export class GlobalModule {}
```

Once a global module is registered in the root `AppModule`, its providers can be injected into any class in the application without further imports.

> [!TIP]
> `SqlModule` and `CqrsModule` are examples of global modules provided by Bunstone.
````

## Source: `docs/logging.md`

````md
# Logging

Bunstone exports a lightweight `Logger` utility for framework internals and application code.

## Basic Usage

```typescript
import { Logger } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("UsersService");

logger.log("Service started");
logger.warn("Cache miss");
logger.error("Could not load user", { userId: 42 });
```

## Log Levels

Available levels:

- `LogLevel.DEBUG`
- `LogLevel.INFO`
- `LogLevel.WARN`
- `LogLevel.ERROR`
- `LogLevel.FATAL`

```typescript
import { Logger, LogLevel } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("Worker", {
  level: LogLevel.DEBUG,
});
```

## Options

```typescript
type LoggerOptions = {
  level?: LogLevel;
  timestamp?: boolean;
  pretty?: boolean;
};
```

- `level`: minimum level to print. Default: `LogLevel.INFO`
- `timestamp`: include ISO timestamp. Default: `true`
- `pretty`: pretty colored output when `true`, JSON lines when `false`

## Child Loggers

```typescript
const root = new Logger("App");
const http = root.child("HTTP");

http.info("Server listening");
```

## Timed Blocks

```typescript
await logger.time("sync-users", async () => {
  await syncUsers();
});
```

This logs start/completion in debug mode and records elapsed time.

## Grouped Logs

```typescript
logger.group("Bootstrap", () => {
  logger.info("Loading modules");
  logger.info("Connecting to Redis");
});
```
````

## Source: `docs/routing-params.md`

````md
# Routing & Parameters

Bunstone uses decorators to define routes and extract parameters from requests.

## @Controller()

Defines a class as a controller with an optional base path.

```typescript
@Controller("users")
export class UserController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id };
  }
}
```

## HTTP Methods

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`
- `@Options(path?)`
- `@Head(path?)`

## Parameter Decorators

Extract data directly into your method arguments:

- `@Param(name?)`: Path parameters.
- `@Query(name?)`: Query string parameters.
- `@Body(schema?)`: Request body (supports Zod validation).
- `@Header(name)`: Request headers.
- `@Request()`: The full Elysia request object.

You can also pass Zod schemas to `@Param()` and `@Query()` for automatic parsing and validation.

## Response Customization

### @SetResponseHeader(name, value)

Sets a custom header for the response.

```typescript
@Get("xml")
@SetResponseHeader("Content-Type", "text/xml")
getXml() {
  return "<xml><message>Hello</message></xml>";
}
```

### Zod Validation

You can pass a Zod schema to `@Body`, `@Query`, or `@Param` for automatic validation.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  age: z.number()
});

@Post()
create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
  return data; // data is already validated and typed
}
```

## Practical Example

See more examples of routing, parameters, and validation:

<<< @/../examples/02-routing-params/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/02-routing-params/index.ts)
````

## Source: `docs/guards-jwt.md`

````md
# Guards & JWT

Protect your routes using Guards and built-in JWT support.

## Guards

Guards implement the `GuardContract` and return a boolean (or a Promise of a boolean).

```typescript
export class AuthGuard implements GuardContract {
  validate(req: HttpRequest) {
    return req.headers["authorization"] === "secret-token";
  }
}

@Controller("admin")
export class AdminController {
  @Get("secret")
  @Guard(AuthGuard)
  getSecret() {
    return "Top Secret Data";
  }
}
```

## JWT Integration

Bunstone provides a `JwtModule` and a `@Jwt()` decorator for easy authentication.

### Setup

```typescript
@Module({
  imports: [
    JwtModule.register({
      name: "jwt",
      secret: "your-secret-key",
    }),
  ],
})
export class AppModule {}
```

### Usage

```typescript
@Controller("profile")
export class ProfileController {
  @Get()
  @Jwt() // Automatically uses the internal JwtGuard
  getProfile(@Request() req: any) {
    return req.jwt.user;
  }
}
```

## Practical Example

Check out a full example using both JWT and custom role-based guards:

<<< @/../examples/03-guards-auth/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/03-guards-auth/index.ts)
````

## Source: `docs/cqrs.md`

````md
# CQRS & Sagas

Bunstone provides a full implementation of the Command Query Responsibility Segregation (CQRS) pattern.

## Registration

To use CQRS features, you must import the `CqrsModule` in your root `AppModule`. Since it is a **Global Module**, the buses will be available for injection in all other modules.

```typescript
import { Module, CqrsModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CqrsModule],
})
export class AppModule {}
```

## Command Bus

Commands are used to perform actions that change the state of the application.

```typescript
// 1. Define Command
class CreateUserCommand implements ICommand {
  constructor(public readonly name: string) {}
}

// 2. Define Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand) {
    // logic to create user
    return { id: 1, name: command.name };
  }
}

// 3. Execute
const result = await commandBus.execute(new CreateUserCommand("John"));
```

## Query Bus

Queries are used to retrieve data without changing state.

```typescript
@QueryHandler(GetUserQuery)
class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    return { id: query.id, name: "John" };
  }
}
```

## Event Bus

Events are used to notify other parts of the system that something has happened.

```typescript
@EventsHandler(UserCreatedEvent)
class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    console.log(`User created: ${event.userId}`);
  }
}
```

## Sagas

Sagas are long-running processes that react to events and can trigger new commands. They use a reactive stream approach.

```typescript
@Injectable()
export class UserSaga {
  @Saga()
  onUserCreated = (events$: IEventStream) =>
    events$.pipe(
      ofType(UserCreatedEvent),
      map((event) => new SendWelcomeEmailCommand(event.email))
    );
}
```

## Practical Example

For a complete working example of CQRS with commands and handlers, see:

<<< @/../examples/04-cqrs/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/04-cqrs/index.ts)
````

## Source: `docs/scheduling.md`

````md
# Scheduling

Bunstone supports decorator-based scheduling for background tasks.

## @Timeout()

Executes a method once after a specified delay (in milliseconds).

```typescript
@Injectable()
export class TaskService {
  @Timeout(5000)
  runOnce() {
    console.log("Executed after 5 seconds");
  }
}
```

## @Cron()

Executes a method repeatedly based on a cron expression.

```typescript
import { Cron } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class CleanupService {
  @Cron("0 0 * * *") // Every day at midnight
  handleCleanup() {
    console.log("Cleaning up database...");
  }
}
```

> **Note**: Scheduling decorators work on any `@Injectable` class that is registered as a `provider` in a `@Module`.

## Practical Example

Explore more scheduling options and configurations:

<<< @/../examples/06-scheduling/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/06-scheduling/index.ts)
````

## Source: `docs/database-sql.md`

````md
# SQL Module

Bunstone provides a built-in SQL module that wraps [Bun's native SQL client](https://bun.sh/docs/api/sql). It is designed to be globally available once registered.

## Installation

The SQL module is part of the core `@grupodiariodaregiao/bunstone` package.

## Registration

To use the SQL module, you must register it in your root `AppModule` using the `SqlModule.register()` method.

### Example Registration

```typescript
import { Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./app.controller";

@Module({
  imports: [
    SqlModule.register({
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
      database: "my_db",
      provider: "postgresql",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

OR using a connection string:

```typescript
@Module({
  imports: [
    SqlModule.register("postgresql://user:password@localhost:5432/my_db"),
  ],
})
export class AppModule {}
```

## Usage

Once registered, the `SqlService` is globally available. You can inject it into any controller or provider without needing to import `SqlModule` into subsequent modules.

### Injecting SqlService

```typescript
import { Injectable, SqlService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UserService {
  constructor(private readonly sqlService: SqlService) {}

  async getUsers() {
    // Basic query
    return await this.sqlService.query("SELECT * FROM users");
  }

  async getUserById(id: number) {
    // Parameterized query for security
    return await this.sqlService.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
  }
}
```

## Global Availability

Because `SqlModule` is configured with `global: true`, any provider within it (like `SqlService`) is available application-wide. You only need to register it once in your root module.

## Practical Example

See how to register and use the SQL module in a controller:

<<< @/../examples/05-database-sql/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/05-database-sql/index.ts)
````

## Source: `docs/openapi.md`

````md
# OpenAPI (Swagger)

Bunstone provides built-in support for OpenAPI (Swagger) documentation using decorators, similar to NestJS.

## Installation

OpenAPI support is built-in, but you need to enable it in your `AppStartup`.

## Configuration

Enable Swagger in your `AppStartup.create` options:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs", // default is /swagger
    documentation: {
      info: {
        title: "My API",
        version: "1.0.0",
        description: "API Documentation",
      },
    },
  },
}).listen(3000);
```

## Basic Auth Protection

You can optionally protect the Swagger documentation page with HTTP Basic Authentication by providing `auth` credentials:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    auth: {
      username: "admin",
      password: "secret",
    },
    documentation: {
      info: {
        title: "My API",
        version: "1.0.0",
      },
    },
  },
}).listen(3000);
```

When `auth` is set, any request to the documentation path (and its sub-paths such as `/docs/json`) will require a valid `Authorization: Basic <base64(username:password)>` header. Unauthenticated requests receive a `401 Unauthorized` response with a `WWW-Authenticate` challenge, which causes browsers to display a native login dialog. For security, you should only expose this endpoint over HTTPS (or behind a reverse proxy that terminates HTTPS), as Basic Auth credentials are otherwise sent in clear text and can be intercepted.

## Decorators

### @ApiTags()

Adds tags to a controller or a specific method.

```typescript
@ApiTags("Users")
@Controller("users")
export class UserController {
  @ApiTags("Profile")
  @Get("profile")
  getProfile() {}
}
```

### @ApiOperation()

Defines the summary and description for an endpoint.

```typescript
@ApiOperation({ summary: 'Create a user', description: 'This endpoint creates a new user in the database' })
@Post()
create() {}
```

### @ApiResponse()

Defines the possible responses for an endpoint.

```typescript
@ApiResponse({ status: 200, description: 'User found' })
@ApiResponse({ status: 404, description: 'User not found' })
@Get(':id')
findOne() {}
```

### @ApiHeader() / @ApiHeaders()

Defines custom headers for an endpoint or controller.

```typescript
@ApiHeader({ name: "X-Custom-Header", description: "A custom header" })
@Controller("users")
export class UserController {
  @ApiHeaders([
    { name: "X-Token", description: "Auth token", required: true },
    { name: "X-Version", description: "API Version" },
  ])
  @Get()
  findAll() {}
}
```

## DTOs and Schemas

Bunstone uses **Zod** for validation. When you use `@Body(Schema)`, `@Query(Schema)`, or `@Param(Schema)`, the schema is automatically registered in the OpenAPI documentation.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

@Post()
@ApiOperation({ summary: 'Create user' })
create(@Body(CreateUserSchema) body: any) {
  return body;
}
```

## Practical Example

Explore a complete OpenAPI configuration and usage:

<<< @/../examples/08-openapi/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-openapi/index.ts)
````

## Source: `docs/rate-limiting.md`

````md
# Rate Limiting

Protect your endpoints against abuse with configurable rate limiting. Bunstone supports request limiting at multiple levels, with in-memory or Redis-backed storage.

## Overview

Bunstone's rate limiting system provides:

- **Multiple configuration levels**: Global, Controller, or Endpoint
- **Flexible storage**: Memory (default) or Redis (production)
- **Smart identification**: IP + Method + Endpoint
- **Automatic headers**: Limit information on every response
- **Customizable messages**: Customize the 429 error message

## Basic Usage

### Per Endpoint with @RateLimit()

Use the `@RateLimit()` decorator to apply specific limits to individual endpoints:

```typescript
import { Controller, Get, Post, RateLimit } from "@grupodiariodaregiao/bunstone";

@Controller("api")
export class ApiController {
  @Get("public")
  @RateLimit({ max: 100, windowMs: 60000 }) // 100 requests/minute
  getPublic() {
    return { data: [] };
  }

  @Post("sensitive")
  @RateLimit({ max: 5, windowMs: 60000 }) // 5 requests/minute (more restrictive)
  createSensitive() {
    return { success: true };
  }
}
```

### Global Configuration

Apply rate limiting across the entire application via `AppStartup.create()`:

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000, // 1000 requests/minute for all endpoints
  },
});
```

## Configuration Options

### @RateLimit() Decorator

```typescript
@RateLimit({
  max: 100,              // Maximum requests within the window
  windowMs: 60000,       // Time window in milliseconds (1 minute)
  message?: string,      // Custom message when exceeded (optional)
  storage?: Storage,     // Custom storage (optional)
  keyGenerator?: fn,     // Function to generate the identification key (optional)
  skipHeader?: string,   // Header that allows bypass (optional)
  skip?: fn              // Function to skip rate limiting (optional)
})
```

### Global Configuration

```typescript
{
  rateLimit: {
    enabled?: boolean,     // Enable/disable global rate limiting
    max?: number,          // Maximum requests (default: 100)
    windowMs?: number,     // Window in ms (default: 60000)
    storage?: Storage,     // Custom storage
    keyGenerator?: fn,     // Custom key generator
    skipHeader?: string,   // Bypass header
    skip?: fn,             // Bypass function
    message?: string       // Error message
  }
}
```

## Storage

### MemoryStorage (Default)

Ideal for development and single-instance applications:

```typescript
// No configuration required - this is the default
@RateLimit({ max: 100, windowMs: 60000 })
```

### RedisStorage

For production applications with multiple instances:

```typescript
import { RedisStorage } from "@grupodiariodaregiao/bunstone";
import Redis from "ioredis"; // or "redis"

const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000,
    storage: new RedisStorage(redisClient, "ratelimit:"), // optional prefix
  },
});
```

## Response Headers

All responses include informative headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706640000
```

When the limit is exceeded (HTTP 429):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706640000
Retry-After: 45

{ "status": 429, "message": "Too many requests, please try again later." }
```

## Advanced Use Cases

### Custom Identification Key

By default, the key is `IP:Method:Path`. You can customize it:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  keyGenerator: (req) => {
    // Rate limit by authenticated user instead of IP
    return req.headers["x-user-id"] || req.ip;
  },
})
```

### Bypass via Header

Allow bypass in internal environments:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skipHeader: "x-internal-request", // Requests with this header ignore the limit
})
```

### Conditional Bypass

Custom logic to skip rate limiting:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skip: (req) => {
    // Skip for internal IPs
    return req.ip?.startsWith("10.0.0.");
  },
})
```

### Custom Messages

```typescript
@RateLimit({
  max: 5,
  windowMs: 60000,
  message: "You have reached the attempt limit. Please wait 1 minute.",
})
```

## Configuration Hierarchy

Settings are applied in the following precedence order:

1. **`@RateLimit()` decorator** (highest precedence)
2. **Controller configuration** (if implemented)
3. **Global configuration** in `AppStartup.create()`
4. **No rate limit** (default if no configuration is provided)

Merge example:

```typescript
// Global configuration: 1000 req/min
const app = await AppStartup.create(AppModule, {
  rateLimit: { enabled: true, max: 1000, windowMs: 60000 },
});

@Controller("api")
class ApiController {
  @Get("strict")
  @RateLimit({ max: 10 }) // Uses 10 req/min (overrides global)
  strictEndpoint() {}

  @Get("default")
  defaultEndpoint() {} // Uses 1000 req/min (inherits global)
}
```

## Complete Example

<<< @/../examples/08-ratelimit/index.ts

## Production Tips

1. **Use RedisStorage** for multi-instance applications
2. **Configure skipHeader** for health checks and internal monitoring
3. **Adjust windowMs** according to the usage pattern (REST APIs generally use 1 minute)
4. **Monitor the headers** to understand usage patterns
5. **Informative messages** help users understand the limits

## API Reference

### Classes

- `RateLimitService` - Main rate limiting service
- `MemoryStorage` - In-memory implementation
- `RedisStorage` - Redis implementation

### Interfaces

- `RateLimitStorage` - Interface for custom implementations
- `RateLimitConfig` - Rate limit configuration
- `RateLimitInfo` - Usage information
- `RateLimitHeaders` - Response headers

### Decorators

- `@RateLimit(options)` - Applies rate limiting to an endpoint

### Exceptions

- `RateLimitExceededException` - Thrown when the limit is exceeded

[See the full example on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-ratelimit/index.ts)
````

## Source: `docs/mvc-ssr.md`

````md
# MVC & SSR (Zero-Config SSR)

Bunstone provides a native, zero-config way to build **React** applications with full interactiviy (useState, useEffect, etc.) using a traditional MVC pattern.

## Getting Started

### 1. Configure the Views Directory

In your `AppStartup.create`, specify the directory where your React components are stored.

```tsx
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views", // Bunstone will scan and bundle everything here
});
```

### 2. Create your Component

Create a `.tsx` or `.jsx` file in your views directory. All exports should be named exactly like the file, or use `default export`.

```tsx
// src/views/Counter.tsx
import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 border rounded shadow">
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};
```

### 3. Render it from the Controller

Use the `@Render(Component)` decorator. Bunstone will handle the Server-Side Rendering (SSR) and the Client-Side Hydration automatically.

```tsx
import { Controller, Get, Render } from "@grupodiariodaregiao/bunstone";
import { Counter } from "../views/Counter";

@Controller("/")
export class AppController {
  @Get("/")
  @Render(Counter)
  index() {
    // These props are automatically sent to the component
    // on both Server and Client (Hydration)
    return { initialCount: 10 };
  }
}
```

## How it works (The Magic)

Bunstone automates the entire SSR pipeline so you can focus only on your components:

1.  **Automatic Bundling**: On startup, it scans your `viewsDir` and uses `Bun.build` to generate lightweight hydration scripts for every component.
2.  **Server Rendering**: When a route is called, it renders the component to a string on the server for instant page load.
3.  **State Synchronization**: All data returned from your controller is injected into the HTML and automatically picked up by React on the client.
4.  **Instant Interactivity**: The browser downloads the small bundle and React "hydrates" the static HTML, enabling hooks like `useState`.

## Customization

You can return special props from your controller to customize the page:

- `title`: Sets the page `<title>`.
- `description`: Sets the meta description.
- `bundle`: (Optional) If you want to override the automatic bundle for a specific route.

```tsx
@Get("/")
@Render(MyPage)
home() {
  return {
    title: "My Awesome Page",
    myData: "..."
  };
}
```

## Styling

By default, the layout includes **Tailwind CSS** via CDN for quick prototyping. For custom styles, you can add them to the `public/` folder and they will be served automatically.
````

## Source: `docs/testing.md`

````md
# Testing

Bunstone provides a powerful testing module that facilitates integration and End-to-End (E2E) testing. It allows you to compile modules with provider overrides (mocking) and interact with your application without binding to a real network port.

## Installation

The testing module is included in the core package:

```typescript
import { Test, TestingModule } from "@grupodiariodaregiao/bunstone";
```

## Basic Concepts

Testing in Bunstone revolves around three main components:

1.  **`Test`**: A static utility to create a `TestingModuleBuilder`.
2.  **`TestingModule`**: A compiled module that gives you access to the Dependency Injection (DI) container.
3.  **`TestApp`**: A wrapper around your application that allows making HTTP requests directly via `app.handle()`.

---

## Integration Testing (DI Overrides)

You can use the testing module to swap real services with mocks for integration testing.

```typescript
import { describe, expect, it, mock } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";
import { UsersService } from "./users.service";

describe("Users integration", () => {
  it("should use a mocked service", async () => {
    const mockUsersService = {
      findAll: () => [{ id: 1, name: "Test User" }],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    const service = moduleRef.get(UsersService);
    expect(service.findAll()).toEqual([{ id: 1, name: "Test User" }]);
  });
});
```

---

## End-to-End (E2E) Testing

For E2E tests, you can create a `TestApp` instance. This allows you to simulate HTTP requests against your controllers without needing to run a live server on a specific port.

```typescript
import { describe, expect, it } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

describe("AppController (E2E)", () => {
  it("/ (GET)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.get("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello World!" });
  });

  it("/users (POST)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.post("/users", { name: "New User" });

    expect(response.status).toBe(201);
  });
});
```

### `TestApp` Methods

The `TestApp` wrapper supports all standard HTTP methods:

- `app.get(path, options?)`
- `app.post(path, body, options?)`
- `app.put(path, body, options?)`
- `app.patch(path, body, options?)`
- `app.delete(path, options?)`

All methods returns a standard `Response` object.

---

## Testing CQRS

Since CQRS handlers are resolved from the DI container, you can easily mock them or the buses themserves.

```typescript
it("should mock a command handler", async () => {
  const mockHandler = {
    execute: (command) => {
      /* mock implementation */
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CreateUserHandler)
    .useValue(mockHandler)
    .compile();

  // ...
});
```

## Isolation

The `Test.createTestingModule()` utility automatically clears the `GlobalRegistry` and internal state before compilation, ensuring that tests remain isolated from each other.
````

## Source: `docs/bullmq.md`

````md
# BullMQ Module

The `@grupodiariodaregiao/bunstone` BullMQ module provides a way to process background jobs using [BullMQ](https://docs.bullmq.io/).

## Installation

First, ensure you have the required dependencies:

```bash
bun add bullmq ioredis
```

## Setup

To use BullMQ, you need to register the `BullMqModule` in your `AppModule`.

```typescript
import { BullMqModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    BullMqModule.register({
      host: 'localhost',
      port: 6379,
    }),
  ],
})
export class AppModule {}
```

## Creating a Processor

A processor is a class decorated with `@Processor()`. It contains methods decorated with `@Process()` that handle jobs from a specific queue.

```typescript
import { Process, Processor } from "@grupodiariodaregiao/bunstone";
import { Job } from "bullmq";

@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome')
  async handleSendWelcome(job: Job) {
    console.log('Sending welcome email to:', job.data.email);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { sent: true };
  }

  @Process()
  async handleDefault(job: Job) {
    console.log('Handling unknown job type:', job.name);
  }
}
```

Don't forget to add your processor to the `providers` of a module.

## Producing Jobs

You can inject the `QueueService` into your controllers or services to add jobs to a queue.

```typescript
import {
  Controller,
  Get,
  Query,
  QueueService,
} from "@grupodiariodaregiao/bunstone";

@Controller('/email')
export class EmailController {
  constructor(private readonly queueService: QueueService) {}

  @Get('/send')
  async sendEmail(@Query('email') email: string) {
    await this.queueService.add('email-queue', 'send-welcome', { email });
    return { status: 'Job added to queue' };
  }
}
```

## Full Example

Explore a complete producer + processor flow:

<<< @/../examples/12-bullmq/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/12-bullmq/index.ts)

## Processor Options

The `@Processor` decorator accepts an options object:

```typescript
@Processor({
  queueName: 'heavy-tasks',
  concurrency: 5,
})
export class HeavyTaskProcessor {
  // ...
}
```
````

## Source: `docs/rabbitmq.md`

````md
# RabbitMQ Module

The `@grupodiariodaregiao/bunstone` RabbitMQ module provides first-class support for publishing and consuming messages via [RabbitMQ](https://www.rabbitmq.com/) (AMQP 0-9-1).

## Installation

```bash
bun add amqplib
bun add -d @types/amqplib
```

## Setup

Register `RabbitMQModule` once in your root `AppModule`. The module is **global** so `RabbitMQService` is injectable everywhere without re-importing the module.

```typescript
import { Module, RabbitMQModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    RabbitMQModule.register({
      uri: "amqp://guest:guest@localhost:5672",

      exchanges: [
        { name: "events", type: "topic", durable: true },
      ],

      queues: [
        {
          name: "orders.created",
          durable: true,
          bindings: { exchange: "events", routingKey: "orders.created.*" },
        },
      ],

      prefetch: 10,
    }),
  ],
})
export class AppModule {}
```

### Connection options

| Option | Type | Default | Description |
|---|---|---|---|
| `uri` | `string` | – | Full AMQP URI. Takes precedence over individual fields. |
| `host` | `string` | `"localhost"` | Broker hostname |
| `port` | `number` | `5672` | Broker port |
| `username` | `string` | `"guest"` | AMQP username |
| `password` | `string` | `"guest"` | AMQP password |
| `vhost` | `string` | `"/"` | Virtual host |
| `exchanges` | `RabbitMQExchangeConfig[]` | `[]` | Exchanges to assert at startup |
| `queues` | `RabbitMQQueueConfig[]` | `[]` | Queues to assert & bind at startup |
| `prefetch` | `number` | `10` | Unacked message limit per consumer channel |
| `reconnect.enabled` | `boolean` | `true` | Reconnect on connection loss |
| `reconnect.delay` | `number` | `2000` | ms between reconnection attempts |
| `reconnect.maxRetries` | `number` | `10` | Max attempts (0 = unlimited) |

---

## Declaring Exchanges

```typescript
exchanges: [
  {
    name: "orders",
    type: "topic",      // "direct" | "topic" | "fanout" | "headers"
    durable: true,      // survives broker restart (default: true)
    autoDelete: false,  // delete when no bindings remain (default: false)
  },
]
```

## Declaring Queues

```typescript
queues: [
  {
    name: "orders.created",
    durable: true,

    // Bind to one exchange
    bindings: { exchange: "orders", routingKey: "orders.created.*" },

    // Or bind to multiple exchanges
    // bindings: [
    //   { exchange: "orders",  routingKey: "orders.created.*" },
    //   { exchange: "audit",   routingKey: "#" },
    // ],

    // Dead letter exchange for rejected/expired messages
    deadLetterExchange: "orders.dlx",
    deadLetterRoutingKey: "orders.dead",

    messageTtl: 60_000,  // message expiry in ms
    maxLength: 10_000,   // cap queue depth
  },
]
```

---

## Consuming Messages

A **consumer** is a class decorated with `@RabbitConsumer()` that contains methods decorated with `@RabbitSubscribe()`.

There are three subscription modes:

| Mode | When to use |
|---|---|
| **Queue mode** – `{ queue: "..." }` | Consume from a pre-declared, persistent queue. The handler receives **every** message that arrives on that queue, regardless of routing key. |
| **Queue + routing key filter** – `{ queue: "...", routingKey: "..." }` | Consume from a pre-declared queue but **only dispatch** messages whose routing key matches the declared pattern. Messages that don't match are silently acked. |
| **Exchange / routing key mode** – `{ exchange: "...", routingKey: "..." }` | The lib creates an exclusive auto-delete queue per handler and binds it to the exchange. Every handler for the same routing key gets its own copy (broker-level fan-out). |

### Queue mode – in-process fan-out

When **multiple handlers** (in the same or different `@RabbitConsumer` classes) subscribe to the **same queue name**, the lib creates a **single** AMQP consumer and delivers each message to **all handlers** in turn.

```typescript
@RabbitConsumer()
export class Consumer1 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEIVED 1", msg.data);
    msg.ack(); // only the first ack/nack/reject call takes effect
  }
}

@RabbitConsumer()
export class Consumer2 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEIVED 2", msg.data);
    msg.ack(); // no-op: message was already settled above
  }
}
```

### Queue mode with routing key filter

Add `routingKey` to a queue-mode subscription to make it **selective**: the handler is only called when the incoming message's routing key matches the declared pattern. Messages that don't match any handler are **silently acknowledged** so they don't pile up as unacked.

This is useful when a single durable queue receives multiple event types (e.g. `article.*`) but different handlers should react only to specific ones.

```typescript
RabbitMQModule.register({
  exchanges: [{ name: "articles", type: "topic", durable: true }],
  queues: [
    {
      name: "article",
      durable: true,
      bindings: { exchange: "articles", routingKey: "article.*" },
    },
  ],
})
```

```typescript
@RabbitConsumer()
export class ArticleConsumer {

  // ✅ Only called when routingKey === "article.published"
  @RabbitSubscribe({ queue: "article", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("published", msg.data.articleId);
    msg.ack();
  }

  // ✅ Only called when routingKey === "article.deleted"
  @RabbitSubscribe({ queue: "article", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("deleted", msg.data.articleId);
    msg.ack();
  }

  // ✅ No routingKey → called for EVERY message on the queue
  @RabbitSubscribe({ queue: "article" })
  async onAll(msg: RabbitMessage<{ articleId: string }>) {
    console.log("any event", msg.raw.fields.routingKey, msg.data.articleId);
    msg.ack();
  }
}
```

> **Wildcard patterns** – `routingKey` supports the same `*` (one word) and `#` (zero or more words) wildcards as topic exchanges:
> ```typescript
> @RabbitSubscribe({ queue: "article", routingKey: "article.#" })
> // matches: article.published, article.deleted, article.updated.title, …
> ```

> **Unmatched messages** – if a message arrives on the queue but no handler's `routingKey` matches it (and no handler has `routingKey` omitted), the lib automatically acks it to prevent it from blocking the queue.

> **Mix freely** – you can combine filtered and unfiltered handlers on the same queue. Unfiltered handlers (`routingKey` omitted) always run.

> **Durability** – unlike exchange + routing key mode, the queue persists even when no consumers are connected, so messages are never lost. This mode is recommended for production workloads.

> **Settle guard** – `ack()`, `nack()`, and `reject()` are wrapped so only the **first** call takes effect. Subsequent calls from other handlers are silently ignored, preventing "already acknowledged" errors.

> **`noAck` mode** – the channel uses `noAck: true` only when _every_ handler for a queue opts in. If at least one handler uses manual ack (the default), the channel is placed in manual-ack mode.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderConsumer {

  // Manual acknowledgement (default)
  @RabbitSubscribe({ queue: "orders.created" })
  async handleOrderCreated(msg: RabbitMessage<{ orderId: string }>) {
    console.log("New order:", msg.data.orderId);
    msg.ack();         // acknowledge – removes message from queue
    // msg.nack();     // negative-ack + requeue (default requeue: true)
    // msg.reject();   // reject without requeue
  }

  // Automatic acknowledgement
  @RabbitSubscribe({ queue: "notifications", noAck: true })
  async handleNotification(msg: RabbitMessage<{ text: string }>) {
    console.log(msg.data.text);
    // no need to call msg.ack()
  }
}
```

Add the consumer class to the `providers` array of its module:

```typescript
@Module({
  imports: [RabbitMQModule.register({ ... })],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### `RabbitMessage<T>`

| Property | Type | Description |
|---|---|---|
| `data` | `T` | Deserialized JSON payload |
| `raw` | `ConsumeMessage` | Raw amqplib message |
| `ack()` | `() => void` | Acknowledge the message |
| `nack(requeue?)` | `(boolean?) => void` | Negative-ack (requeue default: `true`) |
| `reject()` | `() => void` | Reject without requeueing |

---

## Publishing Messages

Inject `RabbitMQService` anywhere in your application to publish messages.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(order: Order) {
    // Publish to an exchange with a routing key
    await this.rabbit.publish("orders", "orders.created.v1", order);
  }

  async sendDirectToQueue(notification: Notification) {
    // Send directly to a queue, bypassing exchange routing
    await this.rabbit.sendToQueue("notifications", notification);
  }
}
```

### Publish options

Both `publish()` and `sendToQueue()` accept an optional `RabbitPublishOptions` object:

```typescript
await this.rabbit.publish("orders", "orders.created", payload, {
  persistent: true,           // survive broker restart (default: true)
  headers: { "x-version": 2 },
  correlationId: "req-123",
  expiration: 30_000,         // message TTL in ms
  priority: 5,                // 0–9
});
```

---

## Multiple Queues

Because each `@RabbitSubscribe` gets its own dedicated channel, a single consumer class can listen to multiple independent queues simultaneously:

```typescript
@RabbitConsumer()
export class EventConsumer {

  @RabbitSubscribe({ queue: "user.registered" })
  async onUserRegistered(msg: RabbitMessage<User>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "payment.completed" })
  async onPaymentCompleted(msg: RabbitMessage<Payment>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "shipment.dispatched" })
  async onShipmentDispatched(msg: RabbitMessage<Shipment>) { /* … */ msg.ack(); }
}
```

---

## Routing Key Subscriptions (Topic / Direct Fan-out)

Besides consuming a named queue, `@RabbitSubscribe` also supports **routing key mode**:
declare `exchange` + `routingKey` instead of `queue`.

When this mode is used, the lib:

1. Creates a server-named **exclusive, auto-delete** queue per handler at startup.
2. Binds that queue to the given exchange with the given routing key.
3. Starts consuming from that private queue.

Because every handler gets its **own** queue, all handlers subscribed to the same routing
key receive an independent copy of each message — this is the natural fan-out behaviour of
topic exchanges.

> **No queue declarations needed.** The lib manages the ephemeral queues automatically.
> You only need to declare the exchange in `RabbitMQModule.register({ exchanges: [...] })`.

### Basic example

```typescript
// 1. Declare only the exchange in the module
RabbitMQModule.register({
  uri: "amqp://...",
  exchanges: [{ name: "articles", type: "topic" }],
})

// 2. Subscribe to specific routing keys
@RabbitConsumer()
export class ArticleConsumer {

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Published:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.updated" })
  async onUpdated(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Updated:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Deleted:", msg.data.articleId);
    msg.ack();
  }
}
```

```typescript
// 3. Publish with the routing key
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Multiple handlers for the same routing key

Every handler subscribed to the same routing key is called independently.  
You can spread handlers across different classes:

```typescript
/** Handler A – invalidate cache */
@RabbitConsumer()
export class ArticleCacheHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await invalidateCache(msg.data.articleId);
    msg.ack();
  }
}

/** Handler B – send push notification */
@RabbitConsumer()
export class ArticleNotificationHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await sendPushNotification(msg.data.articleId);
    msg.ack();
  }
}

// Publishing one message → both handlers are triggered simultaneously
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Wildcard patterns

Topic exchanges support `*` (one word) and `#` (zero or more words):

```typescript
@RabbitConsumer()
export class ArticleAuditHandler {

  // Matches: article.published, article.updated, article.deleted, …
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.#" })
  async onAnyArticleEvent(msg: RabbitMessage<{ articleId: string }>) {
    console.log(
      "Event:", msg.raw.fields.routingKey,
      "| Article:", msg.data.articleId,
    );
    msg.ack();
  }
}
```

### `@RabbitSubscribe` options reference

| Option | Type | Required | Description |
|---|---|---|---|
| `queue` | `string` | ✅ *(modes 1 & 2)* | Named queue to consume from. |
| `exchange` | `string` | ✅ *(mode 3)* | Exchange to bind to. Must be used together with `routingKey` and **without** `queue`. |
| `routingKey` | `string` | — | Routing key pattern. Supports `*` and `#` wildcards.<br>• With `queue` (mode 2): filters which messages dispatch to this handler.<br>• With `exchange` (mode 3): binds an ephemeral queue to the exchange. |
| `noAck` | `boolean` | — | Auto-acknowledge on delivery. Default: `false`. |

**Mode summary**

| `queue` | `exchange` | `routingKey` | Behaviour |
|:---:|:---:|:---:|---|
| ✅ | — | — | Receives every message from the named queue |
| ✅ | — | ✅ | Receives only messages whose routing key matches the pattern |
| — | ✅ | ✅ | Creates an ephemeral exclusive queue bound to the exchange |

---

## Dead Letter Exchanges & DLQ Reprocessing

When a message is **rejected**, **expired** (TTL), or the queue reaches `maxLength`, RabbitMQ
routes it to a configured **Dead Letter Exchange (DLX)**, from where it lands in a
**Dead Letter Queue (DLQ)**. The lib gives you two tools to work with DLQs:

1. **Auto-topology** – declare the DLX exchange + DLQ queue with a single config option
2. **`RabbitMQDeadLetterService`** – inspect, requeue, or discard dead-lettered messages

### 1. Auto-topology with `deadLetterQueue`

Set `deadLetterExchange` **and** `deadLetterQueue` together. The lib will automatically
assert the DLX exchange, the DLQ queue, and their binding on startup — no need to list
them in the `exchanges` or `queues` arrays separately.

```typescript
RabbitMQModule.register({
  exchanges: [
    { name: "events", type: "topic" },
    // ↑ you only need to declare your main exchange
    // The DLX "orders.cancelled.dlx" is auto-asserted below
  ],
  queues: [
    {
      name: "orders.cancelled",
      bindings: { exchange: "events", routingKey: "orders.cancelled" },

      // ─── Dead Letter config ─────────────────────────────────────────────
      deadLetterExchange:    "orders.cancelled.dlx",  // DLX name (auto-asserted)
      deadLetterRoutingKey:  "orders.cancelled.dead", // routing key to DLQ
      deadLetterQueue:       "orders.cancelled.dlq",  // DLQ name (auto-asserted + bound)
      deadLetterExchangeType: "direct",               // optional, default: "direct"

      messageTtl: 30_000, // messages expire → go to DLQ after 30 s
    },
  ],
})
```

> **What happens at startup**
>
> | Step | Action |
> |------|--------|
> | 1 | Assert `orders.cancelled` queue with `x-dead-letter-exchange` arg |
> | 2 | Assert exchange `orders.cancelled.dlx` (direct, durable) |
> | 3 | Assert queue `orders.cancelled.dlq` (durable) |
> | 4 | Bind `orders.cancelled.dlq` → `orders.cancelled.dlx` with key `orders.cancelled.dead` |

---

### 2. Consuming DLQ messages with `@RabbitSubscribe`

Since the DLQ is a normal queue, you can attach a `@RabbitConsumer` to it.
Messages arrive as `DeadLetterMessage<T>` (import the type from the lib) which
adds a `deathInfo` field and a `republish()` helper.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { DeadLetterMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderDLQConsumer {

  @RabbitSubscribe({ queue: "orders.cancelled.dlq" })
  async handle(msg: DeadLetterMessage<{ orderId: string }>) {
    const { orderId } = msg.data;
    const info = msg.deathInfo; // structured x-death metadata

    console.warn(`Dead letter: ${orderId} | reason=${info?.reason} | attempts=${info?.count}`);

    if ((info?.count ?? 0) < 3) {
      // Retry: republish to the original exchange
      await msg.republish("events", "orders.cancelled");
      msg.ack(); // remove from DLQ after successful republish
    } else {
      // Too many failures → discard
      console.error(`Giving up on order ${orderId}`);
      msg.ack();
    }
  }
}
```

#### `DeadLetterMessage<T>`

| Property | Type | Description |
|---|---|---|
| `data` | `T` | Deserialized JSON payload |
| `raw` | `ConsumeMessage` | Raw amqplib message |
| `deathInfo` | `DeadLetterDeathInfo \| null` | Structured `x-death` metadata |
| `ack()` | `() => void` | Remove permanently from DLQ |
| `nack(requeue?)` | `(boolean?) => void` | Return to DLQ (requeue default: `false`) |
| `republish(exchange, key, opts?)` | `Promise<void>` | Re-publish to an exchange for reprocessing |

#### `DeadLetterDeathInfo`

| Property | Type | Description |
|---|---|---|
| `queue` | `string` | Original queue where the message died |
| `exchange` | `string` | Exchange where it was published |
| `routingKeys` | `string[]` | Routing keys used |
| `count` | `number` | How many times this message has died |
| `reason` | `"rejected" \| "expired" \| "maxlen" \| "delivery-limit"` | Why it was dead-lettered |
| `time` | `Date` | When it was dead-lettered |

---

### 3. Manual reprocessing with `RabbitMQDeadLetterService`

`RabbitMQDeadLetterService` is registered **globally** by `RabbitMQModule` and can be
injected anywhere in your application. Useful for admin REST endpoints, scheduled
requeue jobs, or CLI scripts.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQDeadLetterService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DLQAdminService {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  // How many messages are stuck
  async countFailed() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  // Peek at messages without consuming them
  async preview(limit = 10) {
    return this.dlq.inspect("orders.cancelled.dlq", limit);
  }

  // Move all messages back to the original exchange
  async retryAll() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
    });
  }

  // Move only the first 50
  async retryBatch() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: 50,
    });
  }

  // Permanently delete all dead letters
  async purge() {
    return this.dlq.discardMessages("orders.cancelled.dlq");
  }
}
```

#### `RabbitMQDeadLetterService` API

| Method | Returns | Description |
|---|---|---|
| `inspect<T>(queue, count?)` | `Promise<DeadLetterMessage<T>[]>` | Peek at messages (put back after reading) |
| `requeueMessages(options)` | `Promise<number>` | Move messages → exchange. Returns count requeued. |
| `discardMessages(queue, count?)` | `Promise<number>` | Permanently delete messages. Returns count discarded. |
| `messageCount(queue)` | `Promise<number>` | Current message count in a queue |

#### `RequeueOptions`

| Field | Type | Required | Description |
|---|---|---|---|
| `fromQueue` | `string` | ✅ | Dead letter queue to consume from |
| `toExchange` | `string` | ✅ | Exchange to republish to |
| `routingKey` | `string` | ✅ | Routing key for republished messages |
| `count` | `number` | — | Max messages to requeue. Omit for **all**. |
| `publishOptions` | `RabbitPublishOptions` | — | Additional publish options |

> Every republished message gets an `x-dlq-requeued` header incremented on each manual requeue,
> so you can track how many times a message has been manually retried if needed.

---

### 4. Admin HTTP endpoints example

A common pattern is exposing DLQ management via protected REST endpoints:

```typescript
@Controller("/admin/dlq")
export class DLQController {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  @Get("/count")
  count() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  @Get("/inspect")
  inspect(@Query("limit") limit: string) {
    return this.dlq.inspect("orders.cancelled.dlq", Number(limit ?? 10));
  }

  @Get("/requeue")
  requeue(@Query("limit") limit: string) {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: limit ? Number(limit) : undefined,
    });
  }

  @Get("/discard")
  discard(@Query("limit") limit: string) {
    return this.dlq.discardMessages(
      "orders.cancelled.dlq",
      limit ? Number(limit) : undefined,
    );
  }
}
```

---

## Practical Example

<<< @/../examples/13-rabbitmq/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/13-rabbitmq/index.ts)
````

## Source: `docs/on-module-init.md`

````md
# OnModuleInit

`OnModuleInit` is a lifecycle interface for providers that need startup logic.

When a module is initialized, Bunstone executes `onModuleInit()` for providers that implement `OnModuleInit`.

## Basic Usage

```typescript
import { Injectable, Module } from "@grupodiariodaregiao/bunstone";
import type { OnModuleInit } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppInitService implements OnModuleInit {
  onModuleInit(): void {
    console.log("Module initialized");
  }
}

@Module({
  providers: [AppInitService],
})
export class AppModule {}
```

## Async Initialization

`onModuleInit()` can be async:

```typescript
@Injectable()
class CacheWarmupService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.loadCache();
  }

  private async loadCache() {
    // startup logic
  }
}
```

## Notes

- Use it only in providers registered in `@Module({ providers: [...] })`.
- The method is awaited during app/module startup.
````

## Source: `docs/on-module-destroy.md`

````md
# OnModuleDestroy

`OnModuleDestroy` is a lifecycle interface for cleanup logic.

`onModuleDestroy()` is executed in Elysia's own `onStop` hook, which is the lifecycle hook for application shutdown (end of the lifecycle).

## Basic Usage

```typescript
import {
  AppStartup,
  Injectable,
  Module,
} from "@grupodiariodaregiao/bunstone";
import type { OnModuleDestroy } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppCleanupService implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    // close resources, flush queues, etc.
  }
}

@Module({
  providers: [AppCleanupService],
})
class AppModule {}
```

## Notes

- Use it only in providers registered in `@Module({ providers: [...] })`.
- The method is awaited before Elysia stop lifecycle completes.
````

## Source: `docs/pt-BR/index.md`

````md
---
layout: home

hero:
  name: Bunstone
  text: Framework baseado em decorators para Bun
  tagline: Construa APIs escaláveis e fáceis de manter com Elysia e Bun
  actions:
    - theme: brand
      text: Primeiros Passos
      link: /pt-BR/getting-started
    - theme: alt
      text: Ver no GitHub
      link: https://github.com/diariodaregiao/bunstone

features:
  - title: Injeção de Dependência
    details: Container de DI poderoso e recursivo para gerenciar seus serviços e controllers.
  - title: CQRS & Sagas
    details: Suporte nativo para barramentos de Command, Query e Event com Sagas reativas.
  - title: Baseado em Decorators
    details: Sintaxe limpa e expressiva usando decorators do TypeScript, inspirada no NestJS.
  - title: Rápido e Leve
    details: Construído sobre Bun e Elysia para máximo desempenho.
  - title: MVC & SSR
    details: Suporte nativo a React para Server-Side Rendering com o decorator @Render.
  - title: E-mails Profissionais
    details: Envie e-mails usando componentes React e Tailwind CSS com estilos inline automáticos.
  - title: BullMQ
    details: Processamento de jobs em segundo plano sem esforço com integração ao BullMQ.
  - title: RabbitMQ
    details: Integração completa com broker de mensagens AMQP com exchanges, filas, chaves de roteamento, dead letters e reconexão automática.
  - title: Testes Integrados
    details: Ferramentas otimizadas para testes de integração e E2E com mocking de providers e suporte a aplicações headless.
---
````

## Source: `docs/pt-BR/getting-started.md`

````md
# Primeiros Passos

Bunstone é um framework baseado em decorators para Bun, inspirado no NestJS. Ele fornece uma forma estruturada de construir APIs escaláveis e fáceis de manter.

## Instalação

Você pode criar um novo projeto usando nossa CLI:

```bash
bunx @grupodiariodaregiao/bunstone new my-app
# or shorthand
bunx @grupodiariodaregiao/bunstone my-app
```

### Alternativamente: Use o Template Inicial

Você também pode começar clonando o repositório e usando o diretório `starter`:

```bash
git clone https://github.com/diariodaregiao/bunstone.git
cp -r bunstone/starter my-app
rm -rf bunstone
cd my-app
rm -rf .git
bun install
```

## Configuração Básica

Os projetos Bunstone seguem uma estrutura modular. Aqui está uma configuração básica:

### `src/main.ts`

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await AppStartup.create(AppModule);
  app.listen(3000);
}

bootstrap();
```

### `src/app.module.ts`

```typescript
import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./controllers/app.controller";

@Module({
  controllers: [AppController],
})
export class AppModule {}
```

## Executando a Aplicação

```bash
bun dev
```

Sua aplicação estará rodando em `http://localhost:3000`.

## Exemplo Completo

Confira um exemplo completo e independente de uma aplicação básica:

<<< @/../examples/01-basic-app/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/01-basic-app/index.ts)
````

## Source: `docs/pt-BR/application-runtime.md`

````md
# Runtime da Aplicação

Esta página cobre a API de runtime que inicializa uma aplicação Bunstone e as opções que afetam o comportamento da app.

## `AppStartup.create()`

`AppStartup.create(RootModule, options?)` inicializa o grafo de dependências, registra controllers, middleware, schedulers, filas e retorna uma referência da aplicação.

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

### Valor de retorno

`AppStartup.create()` resolve para um objeto com:

- `listen(port)` para iniciar o servidor HTTP
- `getElysia()` para acessar a instância interna do Elysia

## Opções de Runtime

### `cors`

Encaminha as opções diretamente para `@elysiajs/cors`.

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

Quando definido, o Bunstone percorre o diretório e gera bundles das views React usadas por `@Render()` para hidratação SSR.

```typescript
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views",
});
```

### `swagger`

Habilita a Swagger UI embutida e o endpoint JSON da spec.

```typescript
const app = await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    documentation: {
      info: {
        title: "Minha API",
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

Aplica um rate limit global que pode ser sobrescrito por `@RateLimit()`.

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60_000,
  },
});
```

## Arquivos Estáticos

O Bunstone serve automaticamente o diretório `public/` sob `/public`.

- Arquivo local: `public/logo.png`
- URL pública: `/public/logo.png`

Se `public/` ainda não existir, o Bunstone cria a pasta durante a inicialização.

## Tratamento de Erros

Comportamento embutido durante startup/runtime:

- Instâncias de `HttpException` retornam o status code e body configurados.
- Erros de validação do Zod são normalizados para status `400` com `field` e `message`.
- Erros desconhecidos retornam status `500`.

## Guias Relacionados

- [Primeiros Passos](./getting-started.md)
- [Roteamento & Parâmetros](./routing-params.md)
- [OpenAPI (Swagger)](./openapi.md)
- [Rate Limiting](./rate-limiting.md)
- [MVC & SSR](./mvc-ssr.md)
````

## Source: `docs/pt-BR/cli.md`

````md
# CLI

O Bunstone inclui uma CLI focada em scaffold, diagnósticos locais de desenvolvimento e builds de produção.

## Comandos

### `bunstone new <project-name>`

Cria um novo projeto a partir do starter embutido e executa `bun install`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
```

Você também pode usar a forma curta:

```bash
bunx @grupodiariodaregiao/bunstone my-app
```

### `bunstone run [bun-flags] <entrypoint>`

Executa um entrypoint do Bun e melhora as mensagens de erro de import com dicas dos exports do Bunstone.

```bash
bunstone run src/main.ts
bunstone run --watch src/main.ts
```

Use quando você quiser o runtime normal do Bun com diagnósticos melhores para imports inválidos do Bunstone.

### `bunstone build [entry] [options]`

Empacota o entrypoint da app e, quando existirem, também gera bundles das views React para hidratação SSR.

```bash
bunstone build src/main.ts
```

#### Opções de build

- `--views <dir>`: diretório que contém as views React. Padrão: `src/views`
- `--out <dir>`: diretório de saída do build. Padrão: `dist`
- `--compile`: compila para um binário standalone
- `--no-bundle`: pula o bundle da aplicação e gera apenas os bundles das views

Exemplos:

```bash
bunstone build src/main.ts --out build
bunstone build --compile
bunstone build --views src/views --no-bundle
```

Se nenhum entrypoint for informado, a CLI tenta estes arquivos nesta ordem:

- `src/index.ts`
- `index.ts`
- `src/main.ts`
- `main.ts`

### `bunstone exports`

Imprime os exports públicos de runtime e os exports somente de tipo do pacote.

```bash
bunstone exports
```

Útil para:

- conferir o nome correto de um decorator ou módulo
- confirmar se um símbolo precisa ser importado com `import type`
- depurar erros como `Export named 'X' not found`

## Fluxo Recomendado

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app
bunstone run --watch src/main.ts
```

Para builds de produção:

```bash
bunstone build src/main.ts --out dist
```
````

## Source: `docs/pt-BR/dependency-injection.md`

````md
# Injeção de Dependência

Bunstone usa um poderoso sistema de Injeção de Dependência (DI) que gerencia o ciclo de vida das suas classes e de suas dependências.

## @Injectable()

Para tornar uma classe injetável, use o decorator `@Injectable()`.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DatabaseService {
  query(sql: string) {
    return `Executing: ${sql}`;
  }
}
```

## Injeção via Construtor

As dependências são resolvidas e injetadas automaticamente via construtor.

```typescript
@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  findAll() {
    return this.db.query("SELECT * FROM users");
  }
}
```

## Comportamento Singleton

Por padrão, todos os providers são singletons dentro de sua árvore de módulos. Se vários módulos importarem o mesmo módulo, eles compartilharão as mesmas instâncias dos providers exportados.

## Mesclagem de Módulos

Quando você importa um módulo em outro, o Bunstone mescla os `injectables` para garantir que serviços compartilhados (como um `CommandBus` ou uma `DatabaseConnection`) permaneçam singletons em toda a aplicação.

```typescript
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

@Module({
  imports: [SharedModule],
  controllers: [AppController],
})
export class AppModule {}
```

## Módulos Globais

Às vezes, você pode querer que um provider esteja disponível em todos os lugares sem importar seu módulo em todos os outros módulos. Você pode fazer isso definindo a propriedade `global` como `true` no decorator `@Module`.

```typescript
@Module({
  providers: [GlobalService],
  global: true,
})
export class GlobalModule {}
```

Depois que um módulo global é registrado no `AppModule` raiz, seus providers podem ser injetados em qualquer classe da aplicação sem importações adicionais.

> [!TIP]
> `SqlModule` e `CqrsModule` são exemplos de módulos globais fornecidos pelo Bunstone.
````

## Source: `docs/pt-BR/logging.md`

````md
# Logging

O Bunstone exporta uma utility leve de `Logger` para o framework e para o código da aplicação.

## Uso Básico

```typescript
import { Logger } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("UsersService");

logger.log("Service started");
logger.warn("Cache miss");
logger.error("Could not load user", { userId: 42 });
```

## Níveis de Log

Níveis disponíveis:

- `LogLevel.DEBUG`
- `LogLevel.INFO`
- `LogLevel.WARN`
- `LogLevel.ERROR`
- `LogLevel.FATAL`

```typescript
import { Logger, LogLevel } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("Worker", {
  level: LogLevel.DEBUG,
});
```

## Opções

```typescript
type LoggerOptions = {
  level?: LogLevel;
  timestamp?: boolean;
  pretty?: boolean;
};
```

- `level`: nível mínimo para imprimir. Padrão: `LogLevel.INFO`
- `timestamp`: inclui timestamp ISO. Padrão: `true`
- `pretty`: saída colorida quando `true`, JSON lines quando `false`

## Child Loggers

```typescript
const root = new Logger("App");
const http = root.child("HTTP");

http.info("Server listening");
```

## Blocos Cronometrados

```typescript
await logger.time("sync-users", async () => {
  await syncUsers();
});
```

Isso registra início/conclusão em modo debug e mede o tempo gasto.

## Logs Agrupados

```typescript
logger.group("Bootstrap", () => {
  logger.info("Loading modules");
  logger.info("Connecting to Redis");
});
```
````

## Source: `docs/adapters/cache-adapter.md`

````md
# Cache adapter (Redis)

The `CacheAdapter` is a small abstraction on top of Bun's native Redis client, focused on:

- `set` (permanent or with TTL)
- `get` (typed, always returns an object)
- `exists`
- `remove`

## Import

```ts
import { CacheAdapter } from "@grupodiariodaregiao/bunstone";
```

## Setup

By default it uses Bun's global `redis` client (reads `REDIS_URL` / `VALKEY_URL`).

```ts
const cache = new CacheAdapter();
```

Or pass a custom connection URL:

```ts
const cache = new CacheAdapter({ url: "redis://localhost:6379" });
```

## Set

```ts
await cache.set("user:1", { id: 1, name: "Alice" }, { permanent: true });
await cache.set("session:123", { userId: 1 }, { ttlSeconds: 60 * 60 }); // 1 hour
```

## Get (typed)

`get<T>()` parses JSON automatically and always returns an object (if the key is missing, it returns `{}`).

```ts
type UserCache = { id: number; name: string };
const user = await cache.get<UserCache>("user:1");
```

## Exists / Remove

```ts
const exists = await cache.exists("user:1");
await cache.remove("user:1");
```

## Practical Example

See how to use the Cache Adapter in a controller:

<<< @/../examples/07-adapters/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
````

## Source: `docs/adapters/email-adapter.md`

````md
# Email Service

The `EmailService` allows sending professional emails using **React** for the message body and **Tailwind CSS** for styling. It automatically resolves CSS support issues in email clients by performing _inlining_ of styles during the rendering process.

## Features

- **React Templates**: Use the power of React to build reusable templates.
- **Tailwind CSS**: Style your emails with utility classes that are converted to compatible inline styles.
- **Transparency**: Built on `nodemailer` for SMTP sending.
- **Dependency Injection**: Access the service in any Controller or Service via DI.

## Configuration

To enable email sending, register the `EmailModule` before initializing the app:

```ts
import { AppStartup, EmailModule } from "@grupodiariodaregiao/bunstone";

// Import in your root module
@Module({
  imports: [
    EmailModule.register({
      host: "smtp.example.com",
      port: 587,
      secure: false, // true for port 465
      auth: {
        user: "your-user",
        pass: "your-password",
      },
      from: '"Bunstone App" <noreply@example.com>',
    }),
  ],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
```

## Creating a Template

Use the `EmailLayout` component to provide the necessary base structure and Tailwind support.

```tsx
// templates/WelcomeEmail.tsx
import React from "react";
import { EmailLayout } from "@grupodiariodaregiao/bunstone";
import { Heading, Text, Section, Button } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Welcome to our system!">
    <Heading className="text-2xl font-bold text-gray-800 mb-4">
      Hello, {name}!
    </Heading>
    <Text className="text-gray-600 mb-6">
      We are happy to have you with us.
    </Text>
    <Section className="text-center">
      <Button
        href="https://yoursite.com"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
      >
        Access Dashboard
      </Button>
    </Section>
  </EmailLayout>
);
```

## Sending Emails

Inject the `EmailService` in your Controller or Service to perform the sending:

```ts
import { Controller, Post, EmailService } from "@grupodiariodaregiao/bunstone";
import { WelcomeEmail } from "./templates/WelcomeEmail";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Post("register")
  async register() {
    // ... registration logic

    await this.emailService.send({
      to: "user@email.com",
      subject: "Welcome!",
      component: <WelcomeEmail name="Filipi" />
    });

    return { success: true };
  }
}
```

## EmailService API

### `send(options: SendEmailOptions)`

Sends an email using the specified options:

| Property      | Type                 | Description                                        |
| :------------ | :------------------- | :------------------------------------------------- |
| `to`          | `string \| string[]` | Recipient(s).                                      |
| `subject`     | `string`             | Email subject.                                     |
| `component`   | `React.ReactElement` | React component that will be the email body.       |
| `cc`          | `string \| string[]` | Carbon copy (optional).                            |
| `bcc`         | `string \| string[]` | Blind carbon copy (optional).                      |
| `attachments` | `any[]`              | Attachments compatible with Nodemailer (optional). |

## Important Notes

1. **Inline Styles**: The service uses `@react-email/tailwind` to convert classes into `style=""` attributes on HTML elements.
2. **Images**: For images, use absolute URLs hosted on a CDN, as local images are not displayed in most clients.
3. **Compatibility**: Avoid complex layouts with advanced Flexbox or Grid, prefer simple structures or tables (the `EmailLayout` already helps with this abstraction).

## Practical Example

Explore the complete configuration and email sending in a working example:

<<< @/../examples/11-email-adapter/index.ts
````

## Source: `docs/adapters/form-data.md`

````md
# FormData adapter

Use the `@FormData()` parameter decorator to extract multipart payloads into a typed object. It works on handler parameters inside controllers.

## Import

```ts
import {
  Controller,
  FormData,
  Post,
  type FormDataPayload,
} from "@grupodiariodaregiao/bunstone";
```

## Usage

```ts
class UploadController {
  @Post("/upload")
  upload(
    @FormData({
      fileField: "files", // optional: specific field to read files from
      allowedTypes: ["image/avif"], // optional: mime or extensions allowed
      jsonField: "meta", // optional: parse this field as JSON
    })
    payload: FormDataPayload
  ) {
    // payload.files: File[]
    // payload.json: parsed JSON from jsonField, if provided
  }
}
```

## Options

- `fileField` (string): Only read files from this field. Defaults to all file values in the form.
- `allowedTypes` (string[]): Allowed MIME types or extensions. Rejects others with a bad request.
- `jsonField` (string): Field name to parse as JSON. Rejects non-string or invalid JSON.

## Payload shape

```ts
type FormDataPayload = {
  files: File[];
  json?: unknown;
};
```

## Practical Example

Explore form-data handling with multiple fields:

<<< @/../examples/07-adapters/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
````

## Source: `docs/adapters/upload-adapter.md`

````md
# Upload adapter (MinIO/S3)

The `UploadAdapter` is a small abstraction on top of Bun's native S3 client, focused on:

- Upload a file to a bucket
- Check if an object exists
- Remove an object

## Import

```ts
import { UploadAdapter } from "@grupodiariodaregiao/bunstone";
```

## Setup (MinIO)

```ts
const upload = new UploadAdapter({
  endpoint: "http://localhost:9000",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  bucket: "my-bucket",
});
```

## Upload

`upload()` returns the full bucket path, always starting with `/`.

```ts
const path = await upload.upload({
  path: "images/2025/12/31/image.avif",
  body: file, // File | Blob | Response | Buffer | ...
  contentType: "image/avif",
});

// path === "/images/2025/12/31/image.avif"
```

## Exists / Remove

```ts
const exists = await upload.exists("/images/2025/12/31/image.avif");
await upload.remove("/images/2025/12/31/image.avif");
```
````

## Source: `docs/pt-BR/adapters/cache-adapter.md`

````md
# Adaptador de cache (Redis)

O `CacheAdapter` é uma pequena abstração sobre o cliente Redis nativo do Bun, focada em:

- `set` (permanente ou com TTL)
- `get` (tipado, sempre retorna um objeto)
- `exists`
- `remove`

## Importação

```ts
import { CacheAdapter } from "@grupodiariodaregiao/bunstone";
```

## Configuração

Por padrão, ele usa o cliente global `redis` do Bun (lê `REDIS_URL` / `VALKEY_URL`).

```ts
const cache = new CacheAdapter();
```

Ou passe uma URL de conexão personalizada:

```ts
const cache = new CacheAdapter({ url: "redis://localhost:6379" });
```

## Set

```ts
await cache.set("user:1", { id: 1, name: "Alice" }, { permanent: true });
await cache.set("session:123", { userId: 1 }, { ttlSeconds: 60 * 60 }); // 1 hora
```

## Get (tipado)

`get<T>()` faz o parse de JSON automaticamente e sempre retorna um objeto (se a chave não existir, retorna `{}`).

```ts
type UserCache = { id: number; name: string };
const user = await cache.get<UserCache>("user:1");
```

## Exists / Remove

```ts
const exists = await cache.exists("user:1");
await cache.remove("user:1");
```

## Exemplo prático

Veja como usar o Cache Adapter em um controller:

<<< @/../examples/07-adapters/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
````

## Source: `docs/pt-BR/adapters/email-adapter.md`

````md
# Serviço de e-mail

O `EmailService` permite enviar e-mails profissionais usando **React** para o corpo da mensagem e **Tailwind CSS** para a estilização. Ele resolve automaticamente problemas de suporte a CSS em clientes de e-mail realizando _inlining_ de estilos durante o processo de renderização.

## Recursos

- **Templates em React**: Use o poder do React para criar templates reutilizáveis.
- **Tailwind CSS**: Estilize seus e-mails com classes utilitárias que são convertidas em estilos inline compatíveis.
- **Transparência**: Construído sobre `nodemailer` para envio via SMTP.
- **Injeção de dependência**: Acesse o serviço em qualquer Controller ou Service via DI.

## Configuração

Para habilitar o envio de e-mails, registre o `EmailModule` antes de inicializar a aplicação:

```ts
import { AppStartup, EmailModule } from "@grupodiariodaregiao/bunstone";

// Importe no seu módulo raiz
@Module({
  imports: [
    EmailModule.register({
      host: "smtp.example.com",
      port: 587,
      secure: false, // true para a porta 465
      auth: {
        user: "your-user",
        pass: "your-password",
      },
      from: '"Bunstone App" <noreply@example.com>',
    }),
  ],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
```

## Criando um template

Use o componente `EmailLayout` para fornecer a estrutura base necessária e o suporte a Tailwind.

```tsx
// templates/WelcomeEmail.tsx
import React from "react";
import { EmailLayout } from "@grupodiariodaregiao/bunstone";
import { Heading, Text, Section, Button } from "@react-email/components";

export const WelcomeEmail = ({ name }: { name: string }) => (
  <EmailLayout preview="Boas-vindas ao nosso sistema!">
    <Heading className="text-2xl font-bold text-gray-800 mb-4">
      Olá, {name}!
    </Heading>
    <Text className="text-gray-600 mb-6">
      Estamos felizes em ter você conosco.
    </Text>
    <Section className="text-center">
      <Button
        href="https://yoursite.com"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
      >
        Acessar painel
      </Button>
    </Section>
  </EmailLayout>
);
```

## Enviando e-mails

Injete o `EmailService` no seu Controller ou Service para realizar o envio:

```ts
import { Controller, Post, EmailService } from "@grupodiariodaregiao/bunstone";
import { WelcomeEmail } from "./templates/WelcomeEmail";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Post("register")
  async register() {
    // ... lógica de cadastro

    await this.emailService.send({
      to: "user@email.com",
      subject: "Bem-vindo!",
      component: <WelcomeEmail name="Filipi" />
    });

    return { success: true };
  }
}
```

## API do EmailService

### `send(options: SendEmailOptions)`

Envia um e-mail usando as opções especificadas:

| Property      | Type                 | Description                                        |
| :------------ | :------------------- | :------------------------------------------------- |
| `to`          | `string \| string[]` | Destinatário(s).                                   |
| `subject`     | `string`             | Assunto do e-mail.                                 |
| `component`   | `React.ReactElement` | Componente React que será o corpo do e-mail.       |
| `cc`          | `string \| string[]` | Cópia carbono (opcional).                          |
| `bcc`         | `string \| string[]` | Cópia carbono oculta (opcional).                   |
| `attachments` | `any[]`              | Anexos compatíveis com Nodemailer (opcional).      |

## Observações importantes

1. **Estilos inline**: O serviço usa `@react-email/tailwind` para converter classes em atributos `style=""` nos elementos HTML.
2. **Imagens**: Para imagens, use URLs absolutas hospedadas em uma CDN, pois imagens locais não são exibidas na maioria dos clientes.
3. **Compatibilidade**: Evite layouts complexos com Flexbox ou Grid avançados; prefira estruturas simples ou tabelas (o `EmailLayout` já ajuda com essa abstração).

## Exemplo prático

Explore a configuração completa e o envio de e-mails em um exemplo funcional:

<<< @/../examples/11-email-adapter/index.ts
````

## Source: `docs/pt-BR/adapters/form-data.md`

````md
# Adaptador FormData

Use o decorator de parâmetro `@FormData()` para extrair payloads multipart em um objeto tipado. Ele funciona em parâmetros de handlers dentro de controllers.

## Importação

```ts
import {
  Controller,
  FormData,
  Post,
  type FormDataPayload,
} from "@grupodiariodaregiao/bunstone";
```

## Uso

```ts
class UploadController {
  @Post("/upload")
  upload(
    @FormData({
      fileField: "files", // opcional: campo específico de onde ler arquivos
      allowedTypes: ["image/avif"], // opcional: mimes ou extensões permitidas
      jsonField: "meta", // opcional: faz o parse deste campo como JSON
    })
    payload: FormDataPayload
  ) {
    // payload.files: File[]
    // payload.json: JSON parseado de jsonField, se fornecido
  }
}
```

## Opções

- `fileField` (string): Lê arquivos apenas deste campo. O padrão é ler todos os valores de arquivo do formulário.
- `allowedTypes` (string[]): Tipos MIME ou extensões permitidos. Rejeita os demais com bad request.
- `jsonField` (string): Nome do campo a ser parseado como JSON. Rejeita valor não string ou JSON inválido.

## Formato do payload

```ts
type FormDataPayload = {
  files: File[];
  json?: unknown;
};
```

## Exemplo prático

Explore o tratamento de form-data com múltiplos campos:

<<< @/../examples/07-adapters/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
````

## Source: `docs/pt-BR/adapters/upload-adapter.md`

````md
# Adaptador de upload (MinIO/S3)

O `UploadAdapter` é uma pequena abstração sobre o cliente S3 nativo do Bun, focada em:

- Fazer upload de um arquivo para um bucket
- Verificar se um objeto existe
- Remover um objeto

## Importação

```ts
import { UploadAdapter } from "@grupodiariodaregiao/bunstone";
```

## Configuração (MinIO)

```ts
const upload = new UploadAdapter({
  endpoint: "http://localhost:9000",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  bucket: "my-bucket",
});
```

## Upload

`upload()` retorna o caminho completo no bucket, sempre começando com `/`.

```ts
const path = await upload.upload({
  path: "images/2025/12/31/image.avif",
  body: file, // File | Blob | Response | Buffer | ...
  contentType: "image/avif",
});

// path === "/images/2025/12/31/image.avif"
```

## Exists / Remove

```ts
const exists = await upload.exists("/images/2025/12/31/image.avif");
await upload.remove("/images/2025/12/31/image.avif");
```
````

## Source: `docs/pt-BR/bullmq.md`

````md
# Módulo BullMQ

O módulo BullMQ de `@grupodiariodaregiao/bunstone` fornece uma forma de processar tarefas em segundo plano usando [BullMQ](https://docs.bullmq.io/).

## Instalação

Primeiro, garanta que você tenha as dependências necessárias:

```bash
bun add bullmq ioredis
```

## Configuração

Para usar BullMQ, você precisa registrar o `BullMqModule` no seu `AppModule`.

```typescript
import { BullMqModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    BullMqModule.register({
      host: 'localhost',
      port: 6379,
    }),
  ],
})
export class AppModule {}
```

## Criando um processor

Um processor é uma classe decorada com `@Processor()`. Ela contém métodos decorados com `@Process()` que lidam com jobs de uma fila específica.

```typescript
import { Process, Processor } from "@grupodiariodaregiao/bunstone";
import { Job } from "bullmq";

@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome')
  async handleSendWelcome(job: Job) {
    console.log('Enviando e-mail de boas-vindas para:', job.data.email);
    // Simula trabalho
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { sent: true };
  }

  @Process()
  async handleDefault(job: Job) {
    console.log('Processando tipo de job desconhecido:', job.name);
  }
}
```

Não se esqueça de adicionar seu processor aos `providers` de um módulo.

## Produzindo jobs

Você pode injetar o `QueueService` nos seus controllers ou services para adicionar jobs a uma fila.

```typescript
import {
  Controller,
  Get,
  Query,
  QueueService,
} from "@grupodiariodaregiao/bunstone";

@Controller('/email')
export class EmailController {
  constructor(private readonly queueService: QueueService) {}

  @Get('/send')
  async sendEmail(@Query('email') email: string) {
    await this.queueService.add('email-queue', 'send-welcome', { email });
    return { status: 'Job adicionado à fila' };
  }
}
```

## Exemplo completo

Explore um fluxo completo com producer + processor:

<<< @/../examples/12-bullmq/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/12-bullmq/index.ts)

## Opções do processor

O decorator `@Processor` aceita um objeto de opções:

```typescript
@Processor({
  queueName: 'heavy-tasks',
  concurrency: 5,
})
export class HeavyTaskProcessor {
  // ...
}
```
````

## Source: `docs/pt-BR/cqrs.md`

````md
# CQRS e Sagas

O Bunstone fornece uma implementação completa do padrão Command Query Responsibility Segregation (CQRS).

## Registro

Para usar os recursos de CQRS, você deve importar o `CqrsModule` no seu `AppModule` raiz. Como ele é um **Módulo Global**, os buses estarão disponíveis para injeção em todos os outros módulos.

```typescript
import { Module, CqrsModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CqrsModule],
})
export class AppModule {}
```

## Command Bus

Commands são usados para executar ações que alteram o estado da aplicação.

```typescript
// 1. Defina o Command
class CreateUserCommand implements ICommand {
  constructor(public readonly name: string) {}
}

// 2. Defina o Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand) {
    // lógica para criar usuário
    return { id: 1, name: command.name };
  }
}

// 3. Execute
const result = await commandBus.execute(new CreateUserCommand("John"));
```

## Query Bus

Queries são usadas para recuperar dados sem alterar o estado.

```typescript
@QueryHandler(GetUserQuery)
class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    return { id: query.id, name: "John" };
  }
}
```

## Event Bus

Events são usados para notificar outras partes do sistema de que algo aconteceu.

```typescript
@EventsHandler(UserCreatedEvent)
class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    console.log(`Usuário criado: ${event.userId}`);
  }
}
```

## Sagas

Sagas são processos de longa duração que reagem a eventos e podem disparar novos commands. Elas usam uma abordagem de fluxo reativo.

```typescript
@Injectable()
export class UserSaga {
  @Saga()
  onUserCreated = (events$: IEventStream) =>
    events$.pipe(
      ofType(UserCreatedEvent),
      map((event) => new SendWelcomeEmailCommand(event.email))
    );
}
```

## Exemplo prático

Para um exemplo completo e funcional de CQRS com commands e handlers, veja:

<<< @/../examples/04-cqrs/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/04-cqrs/index.ts)
````

## Source: `docs/pt-BR/database-sql.md`

````md
# Módulo SQL

O Bunstone fornece um módulo SQL nativo que encapsula o [cliente SQL nativo do Bun](https://bun.sh/docs/api/sql). Ele foi projetado para ficar disponível globalmente após o registro.

## Instalação

O módulo SQL faz parte do pacote principal `@grupodiariodaregiao/bunstone`.

## Registro

Para usar o módulo SQL, você deve registrá-lo no seu `AppModule` raiz usando o método `SqlModule.register()`.

### Exemplo de registro

```typescript
import { Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./app.controller";

@Module({
  imports: [
    SqlModule.register({
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
      database: "my_db",
      provider: "postgresql",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

OU usando uma string de conexão:

```typescript
@Module({
  imports: [
    SqlModule.register("postgresql://user:password@localhost:5432/my_db"),
  ],
})
export class AppModule {}
```

## Uso

Depois de registrado, o `SqlService` fica disponível globalmente. Você pode injetá-lo em qualquer controller ou provider sem precisar importar o `SqlModule` nos módulos subsequentes.

### Injetando o SqlService

```typescript
import { Injectable, SqlService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UserService {
  constructor(private readonly sqlService: SqlService) {}

  async getUsers() {
    // Consulta básica
    return await this.sqlService.query("SELECT * FROM users");
  }

  async getUserById(id: number) {
    // Consulta parametrizada por segurança
    return await this.sqlService.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
  }
}
```

## Disponibilidade global

Como o `SqlModule` é configurado com `global: true`, qualquer provider dentro dele (como o `SqlService`) fica disponível em toda a aplicação. Você só precisa registrá-lo uma vez no seu módulo raiz.

## Exemplo prático

Veja como registrar e usar o módulo SQL em um controller:

<<< @/../examples/05-database-sql/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/05-database-sql/index.ts)
````

## Source: `docs/pt-BR/guards-jwt.md`

````md
# Guards & JWT

Proteja suas rotas usando Guards e suporte integrado a JWT.

## Guards

Guards implementam o `GuardContract` e retornam um booleano (ou uma Promise de um booleano).

```typescript
export class AuthGuard implements GuardContract {
  validate(req: HttpRequest) {
    return req.headers["authorization"] === "secret-token";
  }
}

@Controller("admin")
export class AdminController {
  @Get("secret")
  @Guard(AuthGuard)
  getSecret() {
    return "Top Secret Data";
  }
}
```

## Integração com JWT

Bunstone fornece um `JwtModule` e um decorator `@Jwt()` para autenticação fácil.

### Configuração

```typescript
@Module({
  imports: [
    JwtModule.register({
      name: "jwt",
      secret: "your-secret-key",
    }),
  ],
})
export class AppModule {}
```

### Uso

```typescript
@Controller("profile")
export class ProfileController {
  @Get()
  @Jwt() // Automatically uses the internal JwtGuard
  getProfile(@Request() req: any) {
    return req.jwt.user;
  }
}
```

## Exemplo Prático

Confira um exemplo completo usando JWT e guards personalizados baseados em papéis:

<<< @/../examples/03-guards-auth/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/03-guards-auth/index.ts)
````

## Source: `docs/pt-BR/mvc-ssr.md`

````md
# MVC e SSR (SSR sem configuração)

O Bunstone fornece uma forma nativa, sem configuração, de criar aplicações **React** com interatividade completa (`useState`, `useEffect`, etc.) usando um padrão MVC tradicional.

## Primeiros passos

### 1. Configure o diretório de views

Em `AppStartup.create`, especifique o diretório onde seus componentes React estão armazenados.

```tsx
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views", // O Bunstone irá varrer e gerar bundles de tudo aqui
});
```

### 2. Crie seu componente

Crie um arquivo `.tsx` ou `.jsx` no seu diretório de views. Todos os exports devem ter exatamente o mesmo nome do arquivo, ou usar `default export`.

```tsx
// src/views/Counter.tsx
import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 border rounded shadow">
      <p>Contagem: {count}</p>
      <button onClick={() => setCount(count + 1)}>Incrementar</button>
    </div>
  );
};
```

### 3. Renderize a partir do controller

Use o decorator `@Render(Component)`. O Bunstone cuidará automaticamente do Server-Side Rendering (SSR) e da hidratação no cliente.

```tsx
import { Controller, Get, Render } from "@grupodiariodaregiao/bunstone";
import { Counter } from "../views/Counter";

@Controller("/")
export class AppController {
  @Get("/")
  @Render(Counter)
  index() {
    // Essas props são enviadas automaticamente para o componente
    // tanto no Servidor quanto no Cliente (Hidratação)
    return { initialCount: 10 };
  }
}
```

## Como funciona (A mágica)

O Bunstone automatiza todo o pipeline de SSR para que você possa focar apenas nos seus componentes:

1.  **Geração automática de bundles**: Na inicialização, ele percorre o seu `viewsDir` e usa `Bun.build` para gerar scripts leves de hidratação para cada componente.
2.  **Renderização no servidor**: Quando uma rota é chamada, ele renderiza o componente para string no servidor para carregamento instantâneo da página.
3.  **Sincronização de estado**: Todos os dados retornados pelo seu controller são injetados no HTML e capturados automaticamente pelo React no cliente.
4.  **Interatividade instantânea**: O navegador baixa o pequeno bundle e o React "hidrata" o HTML estático, habilitando hooks como `useState`.

## Personalização

Você pode retornar props especiais do seu controller para personalizar a página:

- `title`: Define o `<title>` da página.
- `description`: Define a meta description.
- `bundle`: (Opcional) Se você quiser sobrescrever o bundle automático para uma rota específica.

```tsx
@Get("/")
@Render(MyPage)
home() {
  return {
    title: "Minha Página Incrível",
    myData: "..."
  };
}
```

## Estilização

Por padrão, o layout inclui **Tailwind CSS** via CDN para prototipação rápida. Para estilos personalizados, você pode adicioná-los à pasta `public/` e eles serão servidos automaticamente.
````

## Source: `docs/pt-BR/on-module-destroy.md`

````md
# OnModuleDestroy

`OnModuleDestroy` é uma interface de ciclo de vida para lógica de limpeza.

`onModuleDestroy()` é executado no próprio hook `onStop` do Elysia, que é o hook de ciclo de vida para o encerramento da aplicação (fim do ciclo de vida).

## Uso Básico

```typescript
import {
  AppStartup,
  Injectable,
  Module,
} from "@grupodiariodaregiao/bunstone";
import type { OnModuleDestroy } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppCleanupService implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    // close resources, flush queues, etc.
  }
}

@Module({
  providers: [AppCleanupService],
})
class AppModule {}
```

## Observações

- Use isso apenas em providers registrados em `@Module({ providers: [...] })`.
- O método é aguardado antes de o ciclo de parada do Elysia ser concluído.
````

## Source: `docs/pt-BR/on-module-init.md`

````md
# OnModuleInit

`OnModuleInit` é uma interface de ciclo de vida para providers que precisam de lógica de inicialização.

Quando um módulo é inicializado, o Bunstone executa `onModuleInit()` para providers que implementam `OnModuleInit`.

## Uso Básico

```typescript
import { Injectable, Module } from "@grupodiariodaregiao/bunstone";
import type { OnModuleInit } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppInitService implements OnModuleInit {
  onModuleInit(): void {
    console.log("Module initialized");
  }
}

@Module({
  providers: [AppInitService],
})
export class AppModule {}
```

## Inicialização Assíncrona

`onModuleInit()` pode ser assíncrono:

```typescript
@Injectable()
class CacheWarmupService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.loadCache();
  }

  private async loadCache() {
    // startup logic
  }
}
```

## Observações

- Use isso apenas em providers registrados em `@Module({ providers: [...] })`.
- O método é aguardado durante a inicialização da aplicação/do módulo.
````

## Source: `docs/pt-BR/openapi.md`

````md
# OpenAPI (Swagger)

O Bunstone fornece suporte nativo à documentação OpenAPI (Swagger) usando decorators, de forma semelhante ao NestJS.

## Instalação

O suporte a OpenAPI já vem embutido, mas você precisa habilitá-lo no seu `AppStartup`.

## Configuração

Habilite o Swagger nas opções de `AppStartup.create`:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs", // o padrão é /swagger
    documentation: {
      info: {
        title: "Minha API",
        version: "1.0.0",
        description: "Documentação da API",
      },
    },
  },
}).listen(3000);
```

## Proteção com Basic Auth

Opcionalmente, você pode proteger a página de documentação do Swagger com autenticação HTTP Basic fornecendo credenciais em `auth`:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    auth: {
      username: "admin",
      password: "secret",
    },
    documentation: {
      info: {
        title: "Minha API",
        version: "1.0.0",
      },
    },
  },
}).listen(3000);
```

Quando `auth` está definido, qualquer requisição para o caminho da documentação (e seus subcaminhos, como `/docs/json`) exigirá um header válido `Authorization: Basic <base64(username:password)>`. Requisições não autenticadas recebem uma resposta `401 Unauthorized` com um desafio `WWW-Authenticate`, o que faz os navegadores exibirem uma caixa de login nativa. Por segurança, você só deve expor esse endpoint via HTTPS (ou atrás de um proxy reverso que finalize o HTTPS), já que as credenciais de Basic Auth, caso contrário, são enviadas em texto claro e podem ser interceptadas.

## Decorators

### @ApiTags()

Adiciona tags a um controller ou a um método específico.

```typescript
@ApiTags("Usuários")
@Controller("users")
export class UserController {
  @ApiTags("Perfil")
  @Get("profile")
  getProfile() {}
}
```

### @ApiOperation()

Define o resumo e a descrição de um endpoint.

```typescript
@ApiOperation({ summary: 'Criar um usuário', description: 'Este endpoint cria um novo usuário no banco de dados' })
@Post()
create() {}
```

### @ApiResponse()

Define as possíveis respostas para um endpoint.

```typescript
@ApiResponse({ status: 200, description: 'Usuário encontrado' })
@ApiResponse({ status: 404, description: 'Usuário não encontrado' })
@Get(':id')
findOne() {}
```

### @ApiHeader() / @ApiHeaders()

Define headers personalizados para um endpoint ou controller.

```typescript
@ApiHeader({ name: "X-Custom-Header", description: "Um header personalizado" })
@Controller("users")
export class UserController {
  @ApiHeaders([
    { name: "X-Token", description: "Token de autenticação", required: true },
    { name: "X-Version", description: "Versão da API" },
  ])
  @Get()
  findAll() {}
}
```

## DTOs e Schemas

O Bunstone usa **Zod** para validação. Quando você usa `@Body(Schema)`, `@Query(Schema)` ou `@Param(Schema)`, o schema é automaticamente registrado na documentação OpenAPI.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

@Post()
@ApiOperation({ summary: 'Criar usuário' })
create(@Body(CreateUserSchema) body: any) {
  return body;
}
```

## Exemplo prático

Explore uma configuração completa de OpenAPI e seu uso:

<<< @/../examples/08-openapi/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-openapi/index.ts)
````

## Source: `docs/pt-BR/rabbitmq.md`

````md
# Módulo RabbitMQ

O módulo RabbitMQ do `@grupodiariodaregiao/bunstone` oferece suporte de primeira classe para publicar e consumir mensagens via [RabbitMQ](https://www.rabbitmq.com/) (AMQP 0-9-1).

## Instalação

```bash
bun add amqplib
bun add -d @types/amqplib
```

## Configuração

Registre `RabbitMQModule` uma vez no seu `AppModule` raiz. O módulo é **global**, então `RabbitMQService` pode ser injetado em qualquer lugar sem reimportar o módulo.

```typescript
import { Module, RabbitMQModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    RabbitMQModule.register({
      uri: "amqp://guest:guest@localhost:5672",

      exchanges: [
        { name: "events", type: "topic", durable: true },
      ],

      queues: [
        {
          name: "orders.created",
          durable: true,
          bindings: { exchange: "events", routingKey: "orders.created.*" },
        },
      ],

      prefetch: 10,
    }),
  ],
})
export class AppModule {}
```

### Opções de conexão

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `uri` | `string` | – | URI AMQP completa. Tem precedência sobre os campos individuais. |
| `host` | `string` | `"localhost"` | Hostname do broker |
| `port` | `number` | `5672` | Porta do broker |
| `username` | `string` | `"guest"` | Nome de usuário AMQP |
| `password` | `string` | `"guest"` | Senha AMQP |
| `vhost` | `string` | `"/"` | Host virtual |
| `exchanges` | `RabbitMQExchangeConfig[]` | `[]` | Exchanges a serem garantidas na inicialização |
| `queues` | `RabbitMQQueueConfig[]` | `[]` | Filas a serem garantidas e vinculadas na inicialização |
| `prefetch` | `number` | `10` | Limite de mensagens não confirmadas por canal consumidor |
| `reconnect.enabled` | `boolean` | `true` | Reconectar em caso de perda de conexão |
| `reconnect.delay` | `number` | `2000` | ms entre tentativas de reconexão |
| `reconnect.maxRetries` | `number` | `10` | Máximo de tentativas (0 = ilimitado) |

---

## Declarando Exchanges

```typescript
exchanges: [
  {
    name: "orders",
    type: "topic",      // "direct" | "topic" | "fanout" | "headers"
    durable: true,      // sobrevive à reinicialização do broker (padrão: true)
    autoDelete: false,  // remove quando não restarem bindings (padrão: false)
  },
]
```

## Declarando Filas

```typescript
queues: [
  {
    name: "orders.created",
    durable: true,

    // Vincula a uma exchange
    bindings: { exchange: "orders", routingKey: "orders.created.*" },

    // Ou vincula a múltiplas exchanges
    // bindings: [
    //   { exchange: "orders",  routingKey: "orders.created.*" },
    //   { exchange: "audit",   routingKey: "#" },
    // ],

    // Dead letter exchange para mensagens rejeitadas/expiradas
    deadLetterExchange: "orders.dlx",
    deadLetterRoutingKey: "orders.dead",

    messageTtl: 60_000,  // expiração da mensagem em ms
    maxLength: 10_000,   // limita a profundidade da fila
  },
]
```

---

## Consumindo Mensagens

Um **consumer** é uma classe decorada com `@RabbitConsumer()` que contém métodos decorados com `@RabbitSubscribe()`.

Existem três modos de assinatura:

| Modo | Quando usar |
|---|---|
| **Modo fila** – `{ queue: "..." }` | Consome de uma fila persistente pré-declarada. O handler recebe **todas** as mensagens que chegam nessa fila, independentemente da routing key. |
| **Fila + filtro por routing key** – `{ queue: "...", routingKey: "..." }` | Consome de uma fila pré-declarada, mas **despacha apenas** mensagens cuja routing key corresponda ao padrão declarado. Mensagens que não correspondem são confirmadas silenciosamente. |
| **Modo exchange / routing key** – `{ exchange: "...", routingKey: "..." }` | A lib cria uma fila exclusiva com auto-delete por handler e a vincula à exchange. Cada handler para a mesma routing key recebe sua própria cópia (fan-out no nível do broker). |

### Modo fila – fan-out em processo

Quando **múltiplos handlers** (na mesma classe `@RabbitConsumer` ou em classes diferentes) assinam o **mesmo nome de fila**, a lib cria um único consumer AMQP e entrega cada mensagem para **todos os handlers** em sequência.

```typescript
@RabbitConsumer()
export class Consumer1 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEBIDO 1", msg.data);
    msg.ack(); // apenas a primeira chamada de ack/nack/reject tem efeito
  }
}

@RabbitConsumer()
export class Consumer2 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEBIDO 2", msg.data);
    msg.ack(); // sem efeito: a mensagem já foi concluída acima
  }
}
```

### Modo fila com filtro por routing key

Adicione `routingKey` a uma assinatura em modo fila para torná-la **seletiva**: o handler só é chamado quando a routing key da mensagem recebida corresponde ao padrão declarado. Mensagens que não correspondem a nenhum handler são **confirmadas silenciosamente** para que não se acumulem como não confirmadas.

Isso é útil quando uma única fila durável recebe múltiplos tipos de evento (por exemplo, `article.*`), mas handlers diferentes devem reagir apenas a eventos específicos.

```typescript
RabbitMQModule.register({
  exchanges: [{ name: "articles", type: "topic", durable: true }],
  queues: [
    {
      name: "article",
      durable: true,
      bindings: { exchange: "articles", routingKey: "article.*" },
    },
  ],
})
```

```typescript
@RabbitConsumer()
export class ArticleConsumer {

  // ✅ Só é chamado quando routingKey === "article.published"
  @RabbitSubscribe({ queue: "article", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("publicado", msg.data.articleId);
    msg.ack();
  }

  // ✅ Só é chamado quando routingKey === "article.deleted"
  @RabbitSubscribe({ queue: "article", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("excluído", msg.data.articleId);
    msg.ack();
  }

  // ✅ Sem routingKey → é chamado para TODA mensagem na fila
  @RabbitSubscribe({ queue: "article" })
  async onAll(msg: RabbitMessage<{ articleId: string }>) {
    console.log("qualquer evento", msg.raw.fields.routingKey, msg.data.articleId);
    msg.ack();
  }
}
```

> **Padrões com curingas** – `routingKey` suporta os mesmos curingas `*` (uma palavra) e `#` (zero ou mais palavras) das topic exchanges:
> ```typescript
> @RabbitSubscribe({ queue: "article", routingKey: "article.#" })
> // corresponde a: article.published, article.deleted, article.updated.title, …
> ```

> **Mensagens sem correspondência** – se uma mensagem chegar à fila mas nenhuma `routingKey` de handler corresponder a ela (e nenhum handler tiver `routingKey` omitida), a lib faz `ack` automaticamente para evitar que ela bloqueie a fila.

> **Misture livremente** – você pode combinar handlers filtrados e não filtrados na mesma fila. Handlers não filtrados (`routingKey` omitida) sempre executam.

> **Durabilidade** – ao contrário do modo exchange + routing key, a fila persiste mesmo quando não há consumers conectados, então as mensagens nunca são perdidas. Este modo é recomendado para cargas de trabalho de produção.

> **Proteção de conclusão** – `ack()`, `nack()` e `reject()` são encapsulados para que apenas a **primeira** chamada tenha efeito. Chamadas posteriores de outros handlers são ignoradas silenciosamente, evitando erros de "already acknowledged".

> **Modo `noAck`** – o canal usa `noAck: true` apenas quando _todo_ handler de uma fila opta por isso. Se pelo menos um handler usar ack manual (padrão), o canal entra em modo de ack manual.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderConsumer {

  // Confirmação manual (padrão)
  @RabbitSubscribe({ queue: "orders.created" })
  async handleOrderCreated(msg: RabbitMessage<{ orderId: string }>) {
    console.log("Novo pedido:", msg.data.orderId);
    msg.ack();         // confirma – remove a mensagem da fila
    // msg.nack();     // negativa + reencaminha (requeue padrão: true)
    // msg.reject();   // rejeita sem reencaminhar
  }

  // Confirmação automática
  @RabbitSubscribe({ queue: "notifications", noAck: true })
  async handleNotification(msg: RabbitMessage<{ text: string }>) {
    console.log(msg.data.text);
    // não é necessário chamar msg.ack()
  }
}
```

Adicione a classe consumer ao array `providers` do módulo:

```typescript
@Module({
  imports: [RabbitMQModule.register({ ... })],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### `RabbitMessage<T>`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `data` | `T` | Payload JSON desserializado |
| `raw` | `ConsumeMessage` | Mensagem bruta do amqplib |
| `ack()` | `() => void` | Confirma a mensagem |
| `nack(requeue?)` | `(boolean?) => void` | Confirmação negativa (requeue padrão: `true`) |
| `reject()` | `() => void` | Rejeita sem reenfileirar |

---

## Publicando Mensagens

Injete `RabbitMQService` em qualquer lugar da aplicação para publicar mensagens.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(order: Order) {
    // Publica em uma exchange com uma routing key
    await this.rabbit.publish("orders", "orders.created.v1", order);
  }

  async sendDirectToQueue(notification: Notification) {
    // Envia diretamente para uma fila, ignorando o roteamento por exchange
    await this.rabbit.sendToQueue("notifications", notification);
  }
}
```

### Opções de publicação

Tanto `publish()` quanto `sendToQueue()` aceitam um objeto `RabbitPublishOptions` opcional:

```typescript
await this.rabbit.publish("orders", "orders.created", payload, {
  persistent: true,           // sobrevive à reinicialização do broker (padrão: true)
  headers: { "x-version": 2 },
  correlationId: "req-123",
  expiration: 30_000,         // TTL da mensagem em ms
  priority: 5,                // 0–9
});
```

---

## Múltiplas Filas

Como cada `@RabbitSubscribe` recebe seu próprio canal dedicado, uma única classe consumer pode escutar múltiplas filas independentes simultaneamente:

```typescript
@RabbitConsumer()
export class EventConsumer {

  @RabbitSubscribe({ queue: "user.registered" })
  async onUserRegistered(msg: RabbitMessage<User>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "payment.completed" })
  async onPaymentCompleted(msg: RabbitMessage<Payment>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "shipment.dispatched" })
  async onShipmentDispatched(msg: RabbitMessage<Shipment>) { /* … */ msg.ack(); }
}
```

---

## Assinaturas por Routing Key (Fan-out em Topic / Direct)

Além de consumir uma fila nomeada, `@RabbitSubscribe` também suporta o **modo routing key**:
declare `exchange` + `routingKey` em vez de `queue`.

Quando este modo é usado, a lib:

1. Cria uma fila **exclusiva, com auto-delete e nome gerado pelo servidor** por handler na inicialização.
2. Vincula essa fila à exchange informada com a routing key informada.
3. Começa a consumir dessa fila privada.

Como cada handler recebe sua **própria** fila, todos os handlers inscritos na mesma routing
key recebem uma cópia independente de cada mensagem — este é o comportamento natural de fan-out
das topic exchanges.

> **Não é necessário declarar filas.** A lib gerencia automaticamente as filas efêmeras.
> Você só precisa declarar a exchange em `RabbitMQModule.register({ exchanges: [...] })`.

### Exemplo básico

```typescript
// 1. Declare apenas a exchange no módulo
RabbitMQModule.register({
  uri: "amqp://...",
  exchanges: [{ name: "articles", type: "topic" }],
})

// 2. Assine routing keys específicas
@RabbitConsumer()
export class ArticleConsumer {

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Publicado:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.updated" })
  async onUpdated(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Atualizado:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Excluído:", msg.data.articleId);
    msg.ack();
  }
}
```

```typescript
// 3. Publique com a routing key
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Múltiplos handlers para a mesma routing key

Cada handler inscrito na mesma routing key é chamado de forma independente.  
Você pode distribuir handlers em classes diferentes:

```typescript
/** Handler A – invalida cache */
@RabbitConsumer()
export class ArticleCacheHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await invalidateCache(msg.data.articleId);
    msg.ack();
  }
}

/** Handler B – envia notificação push */
@RabbitConsumer()
export class ArticleNotificationHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await sendPushNotification(msg.data.articleId);
    msg.ack();
  }
}

// Publicando uma mensagem → ambos os handlers são acionados simultaneamente
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Padrões com curingas

Topic exchanges suportam `*` (uma palavra) e `#` (zero ou mais palavras):

```typescript
@RabbitConsumer()
export class ArticleAuditHandler {

  // Corresponde a: article.published, article.updated, article.deleted, …
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.#" })
  async onAnyArticleEvent(msg: RabbitMessage<{ articleId: string }>) {
    console.log(
      "Evento:", msg.raw.fields.routingKey,
      "| Artigo:", msg.data.articleId,
    );
    msg.ack();
  }
}
```

### Referência de opções do `@RabbitSubscribe`

| Opção | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `queue` | `string` | ✅ *(modos 1 e 2)* | Fila nomeada da qual consumir. |
| `exchange` | `string` | ✅ *(modo 3)* | Exchange à qual vincular. Deve ser usada junto com `routingKey` e **sem** `queue`. |
| `routingKey` | `string` | — | Padrão de routing key. Suporta curingas `*` e `#`.<br>• Com `queue` (modo 2): filtra quais mensagens serão despachadas para este handler.<br>• Com `exchange` (modo 3): vincula uma fila efêmera à exchange. |
| `noAck` | `boolean` | — | Confirma automaticamente no recebimento. Padrão: `false`. |

**Resumo dos modos**

| `queue` | `exchange` | `routingKey` | Comportamento |
|:---:|:---:|:---:|---|
| ✅ | — | — | Recebe toda mensagem da fila nomeada |
| ✅ | — | ✅ | Recebe apenas mensagens cuja routing key corresponda ao padrão |
| — | ✅ | ✅ | Cria uma fila exclusiva efêmera vinculada à exchange |

---

## Dead Letter Exchanges e Reprocessamento de DLQ

Quando uma mensagem é **rejeitada**, **expira** (TTL), ou a fila atinge `maxLength`, o RabbitMQ
a encaminha para uma **Dead Letter Exchange (DLX)** configurada, de onde ela cai em uma
**Dead Letter Queue (DLQ)**. A lib oferece duas ferramentas para trabalhar com DLQs:

1. **Topologia automática** – declare a exchange DLX + fila DLQ com uma única opção de configuração
2. **`RabbitMQDeadLetterService`** – inspecione, reenfileire ou descarte mensagens mortas

### 1. Topologia automática com `deadLetterQueue`

Defina `deadLetterExchange` **e** `deadLetterQueue` juntos. A lib irá automaticamente
garantir a exchange DLX, a fila DLQ e o binding entre elas na inicialização — sem precisar
listá-las separadamente nos arrays `exchanges` ou `queues`.

```typescript
RabbitMQModule.register({
  exchanges: [
    { name: "events", type: "topic" },
    // ↑ você só precisa declarar sua exchange principal
    // A DLX "orders.cancelled.dlx" é garantida automaticamente abaixo
  ],
  queues: [
    {
      name: "orders.cancelled",
      bindings: { exchange: "events", routingKey: "orders.cancelled" },

      // ─── Configuração de Dead Letter ─────────────────────────────────────
      deadLetterExchange:    "orders.cancelled.dlx",  // nome da DLX (garantida automaticamente)
      deadLetterRoutingKey:  "orders.cancelled.dead", // routing key para a DLQ
      deadLetterQueue:       "orders.cancelled.dlq",  // nome da DLQ (garantida e vinculada automaticamente)
      deadLetterExchangeType: "direct",               // opcional, padrão: "direct"

      messageTtl: 30_000, // mensagens expiram → vão para a DLQ após 30 s
    },
  ],
})
```

> **O que acontece na inicialização**
>
> | Etapa | Ação |
> |------|--------|
> | 1 | Garante a fila `orders.cancelled` com o argumento `x-dead-letter-exchange` |
> | 2 | Garante a exchange `orders.cancelled.dlx` (direct, durável) |
> | 3 | Garante a fila `orders.cancelled.dlq` (durável) |
> | 4 | Vincula `orders.cancelled.dlq` → `orders.cancelled.dlx` com a chave `orders.cancelled.dead` |

---

### 2. Consumindo mensagens da DLQ com `@RabbitSubscribe`

Como a DLQ é uma fila normal, você pode conectar um `@RabbitConsumer` a ela.
As mensagens chegam como `DeadLetterMessage<T>` (importe o tipo da lib), que
adiciona um campo `deathInfo` e um helper `republish()`.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { DeadLetterMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderDLQConsumer {

  @RabbitSubscribe({ queue: "orders.cancelled.dlq" })
  async handle(msg: DeadLetterMessage<{ orderId: string }>) {
    const { orderId } = msg.data;
    const info = msg.deathInfo; // metadados estruturados de x-death

    console.warn(`Mensagem morta: ${orderId} | motivo=${info?.reason} | tentativas=${info?.count}`);

    if ((info?.count ?? 0) < 3) {
      // Tenta novamente: republica para a exchange original
      await msg.republish("events", "orders.cancelled");
      msg.ack(); // remove da DLQ após republicar com sucesso
    } else {
      // Falhou muitas vezes → descarta
      console.error(`Desistindo do pedido ${orderId}`);
      msg.ack();
    }
  }
}
```

#### `DeadLetterMessage<T>`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `data` | `T` | Payload JSON desserializado |
| `raw` | `ConsumeMessage` | Mensagem bruta do amqplib |
| `deathInfo` | `DeadLetterDeathInfo \| null` | Metadados estruturados de `x-death` |
| `ack()` | `() => void` | Remove permanentemente da DLQ |
| `nack(requeue?)` | `(boolean?) => void` | Retorna para a DLQ (requeue padrão: `false`) |
| `republish(exchange, key, opts?)` | `Promise<void>` | Republica em uma exchange para reprocessamento |

#### `DeadLetterDeathInfo`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `queue` | `string` | Fila original onde a mensagem morreu |
| `exchange` | `string` | Exchange onde ela foi publicada |
| `routingKeys` | `string[]` | Routing keys usadas |
| `count` | `number` | Quantas vezes esta mensagem morreu |
| `reason` | `"rejected" \| "expired" \| "maxlen" \| "delivery-limit"` | Motivo pelo qual ela foi para dead letter |
| `time` | `Date` | Quando ela foi para dead letter |

---

### 3. Reprocessamento manual com `RabbitMQDeadLetterService`

`RabbitMQDeadLetterService` é registrado **globalmente** por `RabbitMQModule` e pode ser
injetado em qualquer lugar da aplicação. Útil para endpoints REST administrativos, jobs
agendados de reenvio ou scripts de CLI.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQDeadLetterService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DLQAdminService {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  // Quantas mensagens estão presas
  async countFailed() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  // Visualiza mensagens sem consumi-las
  async preview(limit = 10) {
    return this.dlq.inspect("orders.cancelled.dlq", limit);
  }

  // Move todas as mensagens de volta para a exchange original
  async retryAll() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
    });
  }

  // Move apenas as primeiras 50
  async retryBatch() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: 50,
    });
  }

  // Exclui permanentemente todas as mensagens mortas
  async purge() {
    return this.dlq.discardMessages("orders.cancelled.dlq");
  }
}
```

#### API de `RabbitMQDeadLetterService`

| Método | Retorna | Descrição |
|---|---|---|
| `inspect<T>(queue, count?)` | `Promise<DeadLetterMessage<T>[]>` | Visualiza mensagens (coloca de volta após ler) |
| `requeueMessages(options)` | `Promise<number>` | Move mensagens → exchange. Retorna a quantidade reenfileirada. |
| `discardMessages(queue, count?)` | `Promise<number>` | Exclui permanentemente mensagens. Retorna a quantidade descartada. |
| `messageCount(queue)` | `Promise<number>` | Quantidade atual de mensagens em uma fila |

#### `RequeueOptions`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `fromQueue` | `string` | ✅ | Dead letter queue da qual consumir |
| `toExchange` | `string` | ✅ | Exchange para a qual republicar |
| `routingKey` | `string` | ✅ | Routing key das mensagens republicadas |
| `count` | `number` | — | Máximo de mensagens para reenfileirar. Omita para **todas**. |
| `publishOptions` | `RabbitPublishOptions` | — | Opções adicionais de publicação |

> Toda mensagem republicada recebe um header `x-dlq-requeued` incrementado a cada reenfileiramento manual,
> para que você possa acompanhar quantas vezes uma mensagem foi tentada manualmente, se necessário.

---

### 4. Exemplo de endpoints HTTP administrativos

Um padrão comum é expor o gerenciamento de DLQ via endpoints REST protegidos:

```typescript
@Controller("/admin/dlq")
export class DLQController {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  @Get("/count")
  count() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  @Get("/inspect")
  inspect(@Query("limit") limit: string) {
    return this.dlq.inspect("orders.cancelled.dlq", Number(limit ?? 10));
  }

  @Get("/requeue")
  requeue(@Query("limit") limit: string) {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: limit ? Number(limit) : undefined,
    });
  }

  @Get("/discard")
  discard(@Query("limit") limit: string) {
    return this.dlq.discardMessages(
      "orders.cancelled.dlq",
      limit ? Number(limit) : undefined,
    );
  }
}
```

---

## Exemplo Prático

<<< @/../examples/13-rabbitmq/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/13-rabbitmq/index.ts)
````

## Source: `docs/pt-BR/rate-limiting.md`

````md
# Rate Limiting

Proteja seus endpoints contra abuso com rate limiting configurável. O Bunstone oferece suporte a limitação de requisições em múltiplos níveis, com storage em memória ou Redis.

## Visão Geral

O sistema de rate limiting do Bunstone oferece:

- **Múltiplos níveis de configuração**: Global, Controller ou Endpoint
- **Storage flexível**: Memória (padrão) ou Redis (produção)
- **Identificação inteligente**: IP + Método + Endpoint
- **Headers automáticos**: Informações de limites em todas as respostas
- **Mensagens customizáveis**: Personalize a mensagem de erro 429

## Uso Básico

### Por Endpoint com @RateLimit()

Use o decorator `@RateLimit()` para aplicar limites específicos a endpoints individuais:

```typescript
import { Controller, Get, Post, RateLimit } from "@grupodiariodaregiao/bunstone";

@Controller("api")
export class ApiController {
  @Get("public")
  @RateLimit({ max: 100, windowMs: 60000 }) // 100 requisições/minuto
  getPublic() {
    return { data: [] };
  }

  @Post("sensitive")
  @RateLimit({ max: 5, windowMs: 60000 }) // 5 requisições/minuto (mais restritivo)
  createSensitive() {
    return { success: true };
  }
}
```

### Configuração Global

Aplique rate limiting em toda a aplicação via `AppStartup.create()`:

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000, // 1000 requisições/minuto para todos os endpoints
  },
});
```

## Opções de Configuração

### @RateLimit() Decorator

```typescript
@RateLimit({
  max: 100,              // Máximo de requisições na janela
  windowMs: 60000,       // Janela de tempo em milissegundos (1 minuto)
  message?: string,      // Mensagem personalizada quando exceder (opcional)
  storage?: Storage,     // Storage customizado (opcional)
  keyGenerator?: fn,     // Função para gerar chave de identificação (opcional)
  skipHeader?: string,   // Header que permite bypass (opcional)
  skip?: fn              // Função para pular rate limit (opcional)
})
```

### Configuração Global

```typescript
{
  rateLimit: {
    enabled?: boolean,     // Habilita/desabilita rate limiting global
    max?: number,          // Máximo de requisições (padrão: 100)
    windowMs?: number,     // Janela em ms (padrão: 60000)
    storage?: Storage,     // Storage customizado
    keyGenerator?: fn,     // Gerador de chave customizado
    skipHeader?: string,   // Header de bypass
    skip?: fn,             // Função de bypass
    message?: string       // Mensagem de erro
  }
}
```

## Storage

### MemoryStorage (Padrão)

Ideal para desenvolvimento e aplicações single-instance:

```typescript
// Não requer configuração - é o padrão
@RateLimit({ max: 100, windowMs: 60000 })
```

### RedisStorage

Para aplicações em produção com múltiplas instâncias:

```typescript
import { RedisStorage } from "@grupodiariodaregiao/bunstone";
import Redis from "ioredis"; // ou "redis"

const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000,
    storage: new RedisStorage(redisClient, "ratelimit:"), // prefix opcional
  },
});
```

## Headers de Resposta

Todas as respostas incluem headers informativos:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706640000
```

Quando o limite é excedido (HTTP 429):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706640000
Retry-After: 45

{ "status": 429, "message": "Too many requests, please try again later." }
```

## Casos de Uso Avançados

### Chave de Identificação Customizada

Por padrão, a chave é `IP:Método:Path`. Você pode customizar:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  keyGenerator: (req) => {
    // Rate limit por usuário autenticado em vez de IP
    return req.headers["x-user-id"] || req.ip;
  },
})
```

### Bypass via Header

Permitir bypass em ambientes internos:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skipHeader: "x-internal-request", // Requisições com este header ignoram o limit
})
```

### Bypass Condicional

Lógica customizada para pular rate limiting:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skip: (req) => {
    // Pular para IPs internos
    return req.ip?.startsWith("10.0.0.");
  },
})
```

### Mensagens Customizadas

```typescript
@RateLimit({
  max: 5,
  windowMs: 60000,
  message: "Você atingiu o limite de tentativas. Aguarde 1 minuto.",
})
```

## Hierarquia de Configuração

As configurações são aplicadas na seguinte ordem de precedência:

1. **Decorator `@RateLimit()`** (maior precedência)
2. **Configuração do Controller** (se implementado)
3. **Configuração Global** em `AppStartup.create()`
4. **Sem rate limit** (padrão se nenhuma configuração)

Exemplo de mesclagem:

```typescript
// Configuração global: 1000 req/min
const app = await AppStartup.create(AppModule, {
  rateLimit: { enabled: true, max: 1000, windowMs: 60000 },
});

@Controller("api")
class ApiController {
  @Get("strict")
  @RateLimit({ max: 10 }) // Usa 10 req/min (sobrescreve global)
  strictEndpoint() {}

  @Get("default")
  defaultEndpoint() {} // Usa 1000 req/min (herda global)
}
```

## Exemplo Completo

<<< @/../examples/08-ratelimit/index.ts

## Dicas de Produção

1. **Use RedisStorage** para aplicações multi-instância
2. **Configure skipHeader** para health checks e monitoramento interno
3. **Ajuste windowMs** conforme o padrão de uso (APIs REST geralmente usam 1 minuto)
4. **Monitore os headers** para entender o padrão de uso
5. **Mensagens informativas** ajudam usuários a entenderem os limites

## API Reference

### Classes

- `RateLimitService` - Serviço principal de rate limiting
- `MemoryStorage` - Implementação em memória
- `RedisStorage` - Implementação Redis

### Interfaces

- `RateLimitStorage` - Interface para implementações customizadas
- `RateLimitConfig` - Configuração de rate limit
- `RateLimitInfo` - Informações de consumo
- `RateLimitHeaders` - Headers de resposta

### Decorators

- `@RateLimit(options)` - Aplica rate limit a um endpoint

### Exceptions

- `RateLimitExceededException` - Lançada quando limite é excedido

[Ver exemplo completo no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-ratelimit/index.ts)
````

## Source: `docs/pt-BR/routing-params.md`

````md
# Roteamento & Parâmetros

Bunstone usa decorators para definir rotas e extrair parâmetros das requisições.

## @Controller()

Define uma classe como um controller com um caminho base opcional.

```typescript
@Controller("users")
export class UserController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id };
  }
}
```

## Métodos HTTP

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`
- `@Options(path?)`
- `@Head(path?)`

## Decorators de Parâmetros

Extraia dados diretamente para os argumentos do seu método:

- `@Param(name?)`: Parâmetros de rota.
- `@Query(name?)`: Parâmetros de query string.
- `@Body(schema?)`: Corpo da requisição (suporta validação com Zod).
- `@Header(name)`: Cabeçalhos da requisição.
- `@Request()`: O objeto completo de requisição do Elysia.

Você também pode passar schemas do Zod para `@Param()` e `@Query()` para parsing e validação automáticos.

## Personalização da Resposta

### @SetResponseHeader(name, value)

Define um cabeçalho personalizado para a resposta.

```typescript
@Get("xml")
@SetResponseHeader("Content-Type", "text/xml")
getXml() {
  return "<xml><message>Hello</message></xml>";
}
```

### Validação com Zod

Você pode passar um schema Zod para `@Body`, `@Query` ou `@Param` para validação automática.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  age: z.number()
});

@Post()
create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
  return data; // data is already validated and typed
}
```

## Exemplo Prático

Veja mais exemplos de roteamento, parâmetros e validação:

<<< @/../examples/02-routing-params/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/02-routing-params/index.ts)
````

## Source: `docs/pt-BR/scheduling.md`

````md
# Agendamento

O Bunstone oferece suporte a agendamento baseado em decorators para tarefas em segundo plano.

## @Timeout()

Executa um método uma vez após um atraso especificado (em milissegundos).

```typescript
@Injectable()
export class TaskService {
  @Timeout(5000)
  runOnce() {
    console.log("Executado após 5 segundos");
  }
}
```

## @Cron()

Executa um método repetidamente com base em uma expressão cron.

```typescript
import { Cron } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class CleanupService {
  @Cron("0 0 * * *") // Todos os dias à meia-noite
  handleCleanup() {
    console.log("Limpando banco de dados...");
  }
}
```

> **Observação**: Os decorators de agendamento funcionam em qualquer classe `@Injectable` que esteja registrada como `provider` em um `@Module`.

## Exemplo prático

Explore mais opções e configurações de agendamento:

<<< @/../examples/06-scheduling/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/06-scheduling/index.ts)
````

## Source: `docs/pt-BR/testing.md`

````md
# Testes

O Bunstone fornece um módulo de testes poderoso que facilita testes de integração e End-to-End (E2E). Ele permite compilar módulos com sobrescrita de providers (mocking) e interagir com sua aplicação sem vinculá-la a uma porta de rede real.

## Instalação

O módulo de testes está incluído no pacote principal:

```typescript
import { Test, TestingModule } from "@grupodiariodaregiao/bunstone";
```

## Conceitos básicos

Os testes no Bunstone giram em torno de três componentes principais:

1.  **`Test`**: Um utilitário estático para criar um `TestingModuleBuilder`.
2.  **`TestingModule`**: Um módulo compilado que dá acesso ao contêiner de Injeção de Dependência (DI).
3.  **`TestApp`**: Um wrapper em torno da sua aplicação que permite fazer requisições HTTP diretamente por meio de `app.handle()`.

---

## Testes de integração (sobrescrita de DI)

Você pode usar o módulo de testes para substituir serviços reais por mocks em testes de integração.

```typescript
import { describe, expect, it, mock } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";
import { UsersService } from "./users.service";

describe("Integração de usuários", () => {
  it("deve usar um serviço mockado", async () => {
    const mockUsersService = {
      findAll: () => [{ id: 1, name: "Test User" }],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    const service = moduleRef.get(UsersService);
    expect(service.findAll()).toEqual([{ id: 1, name: "Test User" }]);
  });
});
```

---

## Testes End-to-End (E2E)

Para testes E2E, você pode criar uma instância de `TestApp`. Isso permite simular requisições HTTP contra seus controllers sem precisar executar um servidor ativo em uma porta específica.

```typescript
import { describe, expect, it } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

describe("AppController (E2E)", () => {
  it("/ (GET)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.get("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello World!" });
  });

  it("/users (POST)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.post("/users", { name: "New User" });

    expect(response.status).toBe(201);
  });
});
```

### Métodos de `TestApp`

O wrapper `TestApp` oferece suporte a todos os métodos HTTP padrão:

- `app.get(path, options?)`
- `app.post(path, body, options?)`
- `app.put(path, body, options?)`
- `app.patch(path, body, options?)`
- `app.delete(path, options?)`

Todos os métodos retornam um objeto `Response` padrão.

---

## Testando CQRS

Como os handlers de CQRS são resolvidos a partir do contêiner de DI, você pode facilmente mocká-los ou até mesmo os próprios buses.

```typescript
it("deve mockar um command handler", async () => {
  const mockHandler = {
    execute: (command) => {
      /* implementação mockada */
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CreateUserHandler)
    .useValue(mockHandler)
    .compile();

  // ...
});
```

## Isolamento

O utilitário `Test.createTestingModule()` limpa automaticamente o `GlobalRegistry` e o estado interno antes da compilação, garantindo que os testes permaneçam isolados entre si.
````

## Full Examples

## Source: `examples/01-basic-app/index.ts`

````ts
import { Module, Controller, Get, Injectable, AppStartup } from "../../index";

@Injectable()
class AppService {
  getHello(): string {
    return "Hello from Bunstone!";
  }
}

@Controller()
class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

@Module({
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Basic app is running on http://localhost:3000");
});
````

## Source: `examples/02-routing-params/index.ts`

````ts
import {
  Module,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  AppStartup,
} from "../../index";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().optional(),
});

@Controller("users")
class UserController {
  @Post()
  createUser(@Body(CreateUserSchema) body: z.infer<typeof CreateUserSchema>) {
    return {
      message: "User created successfully",
      user: body,
    };
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return { id, name: "John Doe" };
  }

  @Get()
  searchUsers(@Query("name") name: string) {
    return {
      query: name,
      results: [
        { id: "1", name: "John Doe" },
        { id: "2", name: "Jane Doe" },
      ].filter((u) =>
        u.name.toLowerCase().includes((name || "").toLowerCase())
      ),
    };
  }
}

@Module({
  controllers: [UserController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Routing example is running on http://localhost:3000");
});
````

## Source: `examples/03-guards-auth/index.ts`

````ts
import {
  Module,
  Controller,
  Get,
  Jwt,
  Guard,
  AppStartup,
  JwtModule,
} from "../../index";
import type { HttpRequest } from "../../lib/types/http-request";
import type { GuardContract } from "../../lib/interfaces/guard-contract";

class RoleGuard implements GuardContract {
  async validate(req: HttpRequest): Promise<boolean> {
    const role = req.headers["x-role"];
    return role === "admin";
  }
}

@Controller("admin")
class AdminController {
  @Get("secret")
  @Jwt() // Checks for Authorization: Bearer <token>
  @Guard(RoleGuard) // Custom check for x-role: admin
  getSecret() {
    return {
      message: "This is a secret area only for admins with valid JWT!",
    };
  }

  @Get("public")
  getPublic() {
    return { message: "This is public" };
  }
}

@Module({
  imports: [
    JwtModule.register({
      name: "jwt",
      secret: "super-secret-key",
    }),
  ],
  controllers: [AdminController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Guards example is running on http://localhost:3000");
});
````

## Source: `examples/04-cqrs/index.ts`

````ts
import {
  Module,
  Controller,
  Post,
  Body,
  AppStartup,
  CqrsModule,
  CommandBus,
  CommandHandler,
} from "../../index";

// 1. Define a Command
class CreateUserCommand {
  constructor(public readonly name: string) {}
}

// 2. Define a Command Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler {
  async execute(command: CreateUserCommand) {
    console.log(`Executing CreateUserCommand for name: ${command.name}`);
    return { id: "123", name: command.name };
  }
}

@Controller("users")
class UserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createUser(@Body() body: { name: string }) {
    // 3. Dispatch the command via the Bus
    return await this.commandBus.execute(new CreateUserCommand(body.name));
  }
}

@Module({
  imports: [CqrsModule],
  controllers: [UserController],
  providers: [CreateUserHandler],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("CQRS example is running on http://localhost:3000");
});
````

## Source: `examples/05-database-sql/index.ts`

````ts
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  AppStartup,
  SqlModule,
  SqlService,
} from "../../index";

@Controller("users")
class UserController {
  constructor(private readonly sql: SqlService) {}

  @Get()
  async getUsers() {
    // Example query using SqlService (requires a running database)
    // return await this.sql.query('SELECT * FROM users');
    return [{ id: 1, name: "Database User" }];
  }

  @Post()
  async createUser(@Body() body: { name: string }) {
    // Example insertion
    // await this.sql.query('INSERT INTO users (name) VALUES (?)', [body.name]);
    return { success: true, user: body.name };
  }
}

@Module({
  imports: [
    SqlModule.register({
      provider: "postgresql",
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
      database: "mydb",
    }),
  ],
  controllers: [UserController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
// app.listen(3000); // Commented out to prevent actual startup without DB
console.log("SQL Database example configured.");
````

## Source: `examples/06-scheduling/index.ts`

````ts
import { Module, Injectable, Cron, Timeout, AppStartup } from "../../index";

@Injectable()
class NotificationTask {
  @Cron("*/10 * * * * *") // Every 10 seconds
  handleCron() {
    console.log("[Schedule] Running periodic notification check...");
  }

  @Timeout(5000) // 5 seconds after startup
  handleTimeout() {
    console.log("[Schedule] App has been running for 5 seconds!");
  }
}

@Module({
  providers: [NotificationTask],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Scheduling example is running on http://localhost:3000");
});
````

## Source: `examples/07-adapters/index.ts`

````ts
import {
  Module,
  Controller,
  Post,
  Get,
  AppStartup,
  CacheAdapter,
  FormData,
} from "../../index";

@Controller("cache")
class CacheController {
  constructor(private readonly cache: CacheAdapter) {}

  @Get(":key")
  async getCache(key: string) {
    const value = await this.cache.get(key);
    return { key, value };
  }

  @Post(":key")
  async setCache(key: string, @Body() body: any) {
    await this.cache.set(key, body, { ttlSeconds: 60 });
    return { success: true };
  }
}

@Controller("upload")
class UploadController {
  @Post()
  async uploadFile(@FormData() formData: any) {
    // Access form fields and files
    const { fields, files } = formData;
    return {
      receivedFields: Object.keys(fields),
      receivedFiles: Object.keys(files),
    };
  }
}

@Module({
  controllers: [CacheController, UploadController],
  providers: [CacheAdapter],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
console.log("Adapters example configured.");
````

## Source: `examples/08-openapi/index.ts`

````ts
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  AppStartup,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "../../index";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

@ApiTags("Users")
@Controller("users")
class UserController {
  @Get()
  @ApiOperation({ summary: "List all users" })
  @ApiResponse({ status: 200, description: "Return all users" })
  getUsers() {
    return [];
  }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  @ApiResponse({ status: 201, description: "User created" })
  createUser(@Body(UserSchema) body: z.infer<typeof UserSchema>) {
    return body;
  }
}

@Module({
  controllers: [UserController],
})
class AppModule {}

const app = await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    title: "Bunstone API",
    version: "1.0.0",
  },
});

app.listen(3000, () => {
  console.log("OpenAPI (Swagger) is available at http://localhost:3000/docs");
});
````

## Source: `examples/08-ratelimit/index.ts`

````ts
import {
  Module,
  Controller,
  Get,
  Post,
  AppStartup,
  RateLimit,
  MemoryStorage,
} from "../../index";

/**
 * Example demonstrating Rate Limiting features
 * 
 * Features:
 * - Endpoint-level rate limiting with @RateLimit()
 * - Global rate limiting configuration
 * - Custom rate limit messages
 * - Rate limit headers in responses
 */

@Controller("api")
class ApiController {
  /**
   * Public endpoint with strict rate limit (5 requests per minute)
   * Returns rate limit headers:
   * - X-RateLimit-Limit: 5
   * - X-RateLimit-Remaining: 4 (decreases with each request)
   * - X-RateLimit-Reset: timestamp
   */
  @Get("public")
  @RateLimit({ max: 5, windowMs: 60000, message: "Too many requests. Please slow down." })
  getPublic() {
    return { message: "This endpoint is rate limited to 5 requests per minute" };
  }

  /**
   * Premium endpoint with higher rate limit (100 requests per minute)
   */
  @Get("premium")
  @RateLimit({ max: 100, windowMs: 60000 })
  getPremium() {
    return { message: "Premium users get 100 requests per minute" };
  }

  /**
   * Write operation with very strict limit (3 requests per minute)
   */
  @Post("create")
  @RateLimit({ max: 3, windowMs: 60000 })
  createResource() {
    return { message: "Resource created", id: "123" };
  }

  /**
   * Unprotected endpoint - no rate limit applied
   */
  @Get("unlimited")
  getUnlimited() {
    return { message: "This endpoint has no rate limiting" };
  }
}

@Module({
  controllers: [ApiController],
})
class AppModule {}

// Example 1: No global rate limit (only decorator-based limits)
const app1 = await AppStartup.create(AppModule);
console.log("Example 1: Decorator-only rate limits");

// Example 2: With global rate limit (applies to ALL endpoints)
const app2 = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,        // 1000 requests per window
    windowMs: 60000,  // per minute
    message: "Global rate limit exceeded",
  },
});
console.log("Example 2: Global rate limit (1000 req/min for all endpoints)");

// Example 3: Custom storage (Redis example - requires Redis connection)
// const redisClient = new Redis(); // from 'ioredis' or 'redis'
// const app3 = await AppStartup.create(AppModule, {
//   rateLimit: {
//     enabled: true,
//     max: 100,
//     windowMs: 60000,
//     storage: new RedisStorage(redisClient), // For multi-instance deployments
//   },
// });

// Start the server
const app = await AppStartup.create(AppModule);
app.listen(3000);
console.log("Rate limiting example running on http://localhost:3000");
console.log("");
console.log("Endpoints:");
console.log("  GET  /api/public     - 5 req/min (decorator limit)");
console.log("  GET  /api/premium    - 100 req/min (decorator limit)");
console.log("  POST /api/create     - 3 req/min (decorator limit)");
console.log("  GET  /api/unlimited  - No rate limit");
console.log("");
console.log("Response headers include:");
console.log("  X-RateLimit-Limit     - Maximum requests allowed");
console.log("  X-RateLimit-Remaining - Remaining requests in window");
console.log("  X-RateLimit-Reset     - Unix timestamp when window resets");
console.log("  Retry-After           - Seconds to wait (only when 429)");
````

## Source: `examples/09-ssr/index.tsx`

````tsx
import React from "react";
import {
  Module,
  Controller,
  Get,
  AppStartup,
  Render,
  Layout,
} from "../../index";

// A simple React component for our Page
const WelcomePage: React.FC<{ name: string; items: string[] }> = ({
  name,
  items,
}) => {
  return (
    <Layout title="Welcome to Bunstone SSR">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Hello, {name}!
        </h1>
        <p className="text-gray-600 mb-6">
          This page was rendered on the server using React and Bun.
        </p>

        <h2 className="text-xl font-semibold mb-2">Features implemented:</h2>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-gray-700">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/" className="text-blue-500 hover:text-blue-700 font-medium">
            &larr; Back to home
          </a>
        </div>
      </div>
    </Layout>
  );
};

@Controller("ssr")
class SsrController {
  @Get()
  @Render(WelcomePage)
  index() {
    // This returns the "Model" which will be passed as props to the component
    return {
      name: "Developer",
      items: [
        "Native TSX support with Bun",
        "@Render decorator for MVC style views",
        "Elysia HTML plugin integration",
        "Default TailwindCSS Layout",
      ],
    };
  }

  @Get("direct")
  direct() {
    // You can still return JSX directly if you don't want to use @Render
    return (
      <Layout title="Direct JSX">
        <div className="p-10 text-center">
          <h1 className="text-4xl font-black">Direct JSX Return</h1>
          <p className="mt-4">
            Sometimes you just want to return a component directly.
          </p>
        </div>
      </Layout>
    );
  }
}

@Module({
  controllers: [SsrController],
})
class SsrModule {}

const app = await AppStartup.create(SsrModule);
// We use a different port from the basic example
const port = 3009;
app.listen(port);
console.log(`SSR example running on http://localhost:${port}/ssr`);
console.log(
  `Direct JSX example running on http://localhost:${port}/ssr/direct`
);
````

## Source: `examples/10-ssr-mvc/index.ts`

````ts
import { AppStartup, Controller, Get, Render, Module } from "../../index";
import { Counter } from "./src/views/Counter";
import { HooksDemo } from "./src/views/HooksDemo";

@Controller("/")
class WelcomeController {
  @Get("/")
  @Render(Counter)
  index() {
    return {
      initialCount: 5,
      title: "Bunstone Auto-Hydration",
    };
  }

  @Get("/hooks")
  @Render(HooksDemo)
  hooksDemo() {
    return {
      initialMessage: "Hello from Server - useEffect will update this!",
      title: "React Hooks Demo",
    };
  }
}

@Module({
  controllers: [WelcomeController],
})
class AppModule {}

const app = await AppStartup.create(AppModule, {
  viewsDir: "examples/10-ssr-mvc/src/views",
});

app.listen(3011);
````

## Source: `examples/11-email-adapter/index.ts`

````ts
import {
  Module,
  Controller,
  Post,
  AppStartup,
  EmailService,
  EmailModule,
  Body,
} from "../../index";
import React from "react";
import { WelcomeEmail } from "./WelcomeEmail";

@Controller("email")
class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send-welcome")
  async sendWelcome(@Body() body: { email: string; name: string }) {
    await this.emailService.send({
      to: body.email,
      subject: "Bem-vindo ao Bunstone",
      component: React.createElement(WelcomeEmail, { name: body.name }),
    });

    return { success: true, message: `E-mail enviado para ${body.email}` };
  }
}

// Register the module with configuration
EmailModule.register({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "your_user",
    pass: "your_pass",
  },
  from: "noreply@bunstone.dev",
});

@Module({
  imports: [EmailModule],
  controllers: [EmailController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);

console.log(
  "Email adapter example configured. Note: Replace SMTP credentials to actually send."
);
````

## Source: `examples/11-email-adapter/WelcomeEmail.tsx`

````tsx
import React from "react";
import { EmailLayout } from "../../index";
import { Text, Link, Button, Section, Heading } from "@react-email/components";

export interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ name }) => {
  return (
    <EmailLayout preview="Bem-vindo ao Bunstone!">
      <Heading className="text-2xl font-bold text-gray-800 mb-4">
        Olá, {name}!
      </Heading>
      <Text className="text-gray-600 mb-4">
        Estamos felizes em ter você aqui. O Bunstone é um framework rápido e
        moderno feito com Bun, React e Elysia.
      </Text>
      <Section className="text-center mt-8">
        <Button
          href="https://github.com/diariodaregiao/bunstone"
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold"
        >
          Ver Documentação
        </Button>
      </Section>
      <Text className="text-sm text-gray-400 mt-8">
        Se você tiver qualquer dúvida, responda este e-mail.
      </Text>
    </EmailLayout>
  );
};
````

## Source: `examples/12-bullmq/index.ts`

````ts
import {
	AppStartup,
	BullMqModule,
	Controller,
	Get,
	Module,
	Process,
	Processor,
	QueueService,
} from "../../index";
import { Job } from "bullmq";

// 1. Define a Job Processor
@Processor({
	queueName: "mail-queue",
	concurrency: 2,
})
export class MailProcessor {
	@Process("welcome-email")
	async handleWelcomeEmail(job: Job) {
		console.log(`[Worker] Processing welcome email for: ${job.data.email}`);
		// Simulate some work
		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log(`[Worker] Welcome email sent to ${job.data.email}`);
		return { success: true, recipient: job.data.email };
	}

	@Process()
	async handleGenericJob(job: Job) {
		console.log(`[Worker] Processing generic job: ${job.name}`);
	}
}

// 2. Define a Controller to produce jobs
@Controller("/jobs")
export class JobsController {
	constructor(private readonly queueService: QueueService) {}

	@Get("/add")
	async addJob() {
		const email = `user-${Math.floor(Math.random() * 1000)}@example.com`;
		console.log(`[Controller] Adding welcome-email job for ${email}`);

		await this.queueService.add("mail-queue", "welcome-email", { email });

		return {
			message: "Job added to queue",
			email,
		};
	}
}

// 3. Setup the Application Module
@Module({
	imports: [
		BullMqModule.register({
			host: process.env.REDIS_HOST || "localhost",
			port: Number(process.env.REDIS_PORT) || 6379,
		}),
	],
	controllers: [JobsController],
	providers: [MailProcessor],
})
class AppModule {}

// 4. Start the app
console.log("Starting BullMQ example app...");
console.log("Make sure you have a Redis instance running at localhost:6379");
const app = await AppStartup.create(AppModule);
app.listen(3000);
````

## Source: `examples/13-rabbitmq/index.ts`

````ts
import {
	AppStartup,
	Controller,
	Get,
	Injectable,
	Module,
	Query,
	RabbitConsumer,
	RabbitMQDeadLetterService,
	RabbitMQModule,
	RabbitMQService,
	RabbitSubscribe,
} from "../../index";
import type { DeadLetterMessage, RabbitMessage } from "../../index";

// ─── 1. Types ───────────────────────────────────────────────────────────────

interface OrderPayload {
	orderId: string;
	product: string;
	quantity: number;
}

interface NotificationPayload {
	userId: string;
	message: string;
}

// ─── 2. Consumers ────────────────────────────────────────────────────────────

/**
 * Handles messages from the "orders.created" queue.
 * Messages require manual acknowledgement (default).
 */
@RabbitConsumer()
export class OrderConsumer {
	@RabbitSubscribe({ queue: "orders.created" })
	async handleOrderCreated(msg: RabbitMessage<OrderPayload>) {
		const { orderId, product, quantity } = msg.data;
		console.log(
			`[OrderConsumer] New order: #${orderId} – ${quantity}x ${product}`,
		);

		// Simulate async processing
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Acknowledge the message so it's removed from the queue
		msg.ack();
	}

	@RabbitSubscribe({ queue: "orders.cancelled" })
	async handleOrderCancelled(msg: RabbitMessage<{ orderId: string }>) {
		console.log(`[OrderConsumer] Order cancelled: #${msg.data.orderId}`);
		msg.ack();
	}
}

/**
 * Handles messages from the "notifications" queue.
 * Uses noAck mode – no manual acknowledgement needed.
 */
@RabbitConsumer()
export class NotificationConsumer {
	@RabbitSubscribe({ queue: "notifications", noAck: true })
	async handleNotification(msg: RabbitMessage<NotificationPayload>) {
		console.log(
			`[NotificationConsumer] Notify user ${msg.data.userId}: ${msg.data.message}`,
		);
	}
}

// ─── 3. Dead Letter Consumer ─────────────────────────────────────────────────

/**
 * Consumes messages that landed in the Dead Letter Queue for "orders.cancelled".
 *
 * The `deathInfo` property on the message contains structured metadata from the
 * RabbitMQ `x-death` header (original queue, exchange, reason, timestamp, etc.).
 *
 * Options:
 *   msg.ack()                             → remove permanently from DLQ
 *   msg.nack(true)                        → put back in DLQ
 *   msg.republish('events', 'orders.cancelled') → retry via original exchange
 */
@RabbitConsumer()
export class OrderDLQConsumer {
	@RabbitSubscribe({ queue: "orders.cancelled.dlq" })
	async handleFailedCancelledOrder(msg: DeadLetterMessage<{ orderId: string }>) {
		const { orderId } = msg.data;
		const info = msg.deathInfo;

		console.warn(
			`[DLQ] Dead letter received: orderId=${orderId}` +
				(info ? ` | reason=${info.reason} | from=${info.queue} | count=${info.count}` : ""),
		);

		// Decide what to do based on death count
		if ((info?.count ?? 0) < 3) {
			// Retry: republish back to the original exchange
			console.log(`[DLQ] Retrying order #${orderId}…`);
			await msg.republish("events", "orders.cancelled");
			msg.ack(); // remove from DLQ after successful republish
		} else {
			// Too many failures – log and discard
			console.error(`[DLQ] Giving up on order #${orderId} after ${info?.count} attempts`);
			msg.ack();
		}
	}
}

// ─── 4. Service (publisher) ─────────────────────────────────────────────────

@Injectable()
export class OrderService {
	constructor(private readonly rabbit: RabbitMQService) {}

	async createOrder(product: string, quantity: number) {
		const payload: OrderPayload = {
			orderId: `ORD-${Date.now()}`,
			product,
			quantity,
		};

		// Publish to the "events" exchange; routing key routes to "orders.created"
		await this.rabbit.publish("events", "orders.created", payload);
		return payload;
	}

	async cancelOrder(orderId: string) {
		await this.rabbit.publish("events", "orders.cancelled", { orderId });
		return { orderId, status: "cancelled" };
	}

	async sendNotification(userId: string, message: string) {
		// Send directly to a queue, bypassing the exchange
		await this.rabbit.sendToQueue("notifications", { userId, message });
		return { sent: true };
	}
}

// ─── 5. Controller ───────────────────────────────────────────────────────────

@Controller("/orders")
export class OrderController {
	constructor(
		private readonly orderService: OrderService,
		private readonly dlq: RabbitMQDeadLetterService,
	) {}

	@Get("/create")
	async create(
		@Query("product") product: string,
		@Query("qty") qty: string,
	) {
		const order = await this.orderService.createOrder(
			product ?? "Widget",
			Number(qty ?? 1),
		);
		return { message: "Order published", order };
	}

	@Get("/cancel")
	async cancel(@Query("id") id: string) {
		return this.orderService.cancelOrder(id ?? "ORD-UNKNOWN");
	}

	@Get("/notify")
	async notify(
		@Query("userId") userId: string,
		@Query("msg") message: string,
	) {
		return this.orderService.sendNotification(
			userId ?? "user-1",
			message ?? "Hello!",
		);
	}

	// ── DLQ admin endpoints ────────────────────────────────────────────────

	/** GET /orders/dlq/count – how many messages in the DLQ */
	@Get("/dlq/count")
	async dlqCount() {
		const count = await this.dlq.messageCount("orders.cancelled.dlq");
		return { queue: "orders.cancelled.dlq", count };
	}

	/** GET /orders/dlq/inspect – peek at the first N messages */
	@Get("/dlq/inspect")
	async dlqInspect(@Query("limit") limit: string) {
		const messages = await this.dlq.inspect("orders.cancelled.dlq", Number(limit ?? 10));
		return {
			count: messages.length,
			messages: messages.map((m) => ({
				data: m.data,
				deathInfo: m.deathInfo,
			})),
		};
	}

	/** GET /orders/dlq/requeue – move messages back to the original exchange */
	@Get("/dlq/requeue")
	async dlqRequeue(@Query("limit") limit: string) {
		const requeued = await this.dlq.requeueMessages({
			fromQueue: "orders.cancelled.dlq",
			toExchange: "events",
			routingKey: "orders.cancelled",
			count: limit ? Number(limit) : undefined,
		});
		return { requeued };
	}

	/** GET /orders/dlq/discard – permanently remove messages from the DLQ */
	@Get("/dlq/discard")
	async dlqDiscard(@Query("limit") limit: string) {
		const discarded = await this.dlq.discardMessages(
			"orders.cancelled.dlq",
			limit ? Number(limit) : undefined,
		);
		return { discarded };
	}
}

// ─── 6. Routing-key consumers (topic exchange fan-out) ───────────────────────
//
// Instead of naming a pre-declared queue, these handlers use
//   exchange + routingKey
// The lib creates an exclusive auto-delete queue per handler and binds it to
// the exchange. Because every handler gets its OWN queue, publishing a single
// message to "article.published" triggers ALL handlers subscribed to that key.
//
// Publish with:
//   await this.rabbit.publish("articles", "article.published", { articleId: "1" });

interface ArticlePayload {
	articleId: string;
}

/** First handler for article.published – e.g. invalidate cache */
@RabbitConsumer()
export class ArticleCacheHandler {
	@RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
	async onPublished(msg: RabbitMessage<ArticlePayload>) {
		console.log("[ArticleCacheHandler] Invalidate cache for", msg.data.articleId);
		msg.ack();
	}

	@RabbitSubscribe({ exchange: "articles", routingKey: "article.updated" })
	async onUpdated(msg: RabbitMessage<ArticlePayload>) {
		console.log("[ArticleCacheHandler] Refresh cache for", msg.data.articleId);
		msg.ack();
	}

	@RabbitSubscribe({ exchange: "articles", routingKey: "article.deleted" })
	async onDeleted(msg: RabbitMessage<ArticlePayload>) {
		console.log("[ArticleCacheHandler] Evict cache for", msg.data.articleId);
		msg.ack();
	}
}

/** Second handler for article.published – e.g. send notification */
@RabbitConsumer()
export class ArticleNotificationHandler {
	@RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
	async onPublished(msg: RabbitMessage<ArticlePayload>) {
		console.log(
			"[ArticleNotificationHandler] Send push notification for",
			msg.data.articleId,
		);
		msg.ack();
	}
}

/** Wildcard: subscribe to ALL article events with article.# */
@RabbitConsumer()
export class ArticleAuditHandler {
	@RabbitSubscribe({ exchange: "articles", routingKey: "article.#" })
	async onAnyArticleEvent(msg: RabbitMessage<ArticlePayload>) {
		console.log(
			"[ArticleAuditHandler] Audit event for",
			msg.data.articleId,
			"| routingKey:",
			msg.raw.fields.routingKey,
		);
		msg.ack();
	}
}

// ─── 7. App Module ───────────────────────────────────────────────────────────

@Module({
	imports: [
		RabbitMQModule.register({
			// Provide either `uri` or individual fields
			uri: process.env.RABBITMQ_URI ?? "amqp://guest:guest@localhost:5672",

			// Declare exchanges (asserted at startup)
			exchanges: [
				{
					name: "events",
					type: "topic",
					durable: true,
				},
				// Topic exchange for article events – used by routing-key consumers above
				{
					name: "articles",
					type: "topic",
					durable: true,
				},
			],

			// Declare queues and bind them to the exchange
			queues: [
				{
					name: "orders.created",
					durable: true,
					bindings: { exchange: "events", routingKey: "orders.created" },
				},
				{
					name: "orders.cancelled",
					durable: true,
					bindings: { exchange: "events", routingKey: "orders.cancelled" },
					//
					// Dead Letter configuration ─────────────────────────────────
					// Messages rejected or expired here land in "orders.cancelled.dlq".
					//
					// `deadLetterQueue` triggers auto-topology:
					//   - asserts exchange "orders.cancelled.dlx" (direct)
					//   - asserts queue    "orders.cancelled.dlq"
					//   - binds DLQ → DLX with the deadLetterRoutingKey
					//
					deadLetterExchange: "orders.cancelled.dlx",
					deadLetterRoutingKey: "orders.cancelled.dead",
					deadLetterQueue: "orders.cancelled.dlq",
					messageTtl: 30_000, // messages expire after 30 s → go to DLQ
				},
				{
					name: "notifications",
					durable: true,
				},
				// Note: NO queue declarations needed for the routing-key consumers above.
				// The lib creates exclusive auto-delete queues automatically at runtime.
			],

			// How many unacked messages each consumer channel may hold
			prefetch: 5,

			reconnect: {
				enabled: true,
				delay: 3000,
				maxRetries: 10,
			},
		}),
	],
	controllers: [OrderController],
	providers: [
		OrderService,
		OrderConsumer,
		NotificationConsumer,
		OrderDLQConsumer,
		// Routing-key consumers
		ArticleCacheHandler,
		ArticleNotificationHandler,
		ArticleAuditHandler,
	],
})
class AppModule {}

// ─── 7. Start ────────────────────────────────────────────────────────────────

console.log("Starting RabbitMQ example…");
console.log(
	"Ensure RabbitMQ is running: docker run -p 5672:5672 rabbitmq:4-management",
);
AppStartup.create(AppModule).then(({ listen }) => listen(3000));
````

## Source: `examples/package.json`

````json
{
  "name": "bunstone-examples",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start:basic": "bun 01-basic-app/index.ts",
    "start:routing": "bun 02-routing-params/index.ts",
    "start:guards": "bun 03-guards-auth/index.ts",
    "start:cqrs": "bun 04-cqrs/index.ts",
    "start:db": "bun 05-database-sql/index.ts",
    "start:schedule": "bun 06-scheduling/index.ts",
    "start:adapters": "bun 07-adapters/index.ts",
    "start:openapi": "bun 08-openapi/index.ts",
    "start:ssr": "bun 09-ssr/index.tsx",
    "start:mvc": "bun 10-ssr-mvc/index.ts",
    "start:email": "bun 11-email-adapter/index.ts"
  },
  "dependencies": {
    "bunstone": "link:..",
    "zod": "^4.3.2",
    "reflect-metadata": "^0.2.1"
  }
}
````

## Source: `examples/10-ssr-mvc/src/views/Counter.tsx`

````tsx
import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }: { initialCount?: number }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm mx-auto mt-10">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
        Auto-Hydrated Counter
      </h2>
      <p className="text-gray-500 mb-6">
        This component was bundled <strong>automatically</strong> by Bunstone.
      </p>

      <div className="flex items-center justify-center gap-6 mb-8">
        <button
          onClick={() => setCount(count - 1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-2xl font-bold"
        >
          -
        </button>
        <span className="text-5xl font-mono font-bold text-indigo-600 min-w-[3ch]">
          {count}
        </span>
        <button
          onClick={() => setCount(count + 1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-2xl font-bold"
        >
          +
        </button>
      </div>

      <button
        onClick={() => setCount(0)}
        className="text-sm text-gray-400 hover:text-indigo-500 underline decoration-dotted underline-offset-4"
      >
        Reset to zero
      </button>
    </div>
  );
};
````

## Source: `examples/10-ssr-mvc/src/views/HooksDemo.tsx`

````tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

export interface HooksDemoProps {
  initialMessage?: string;
}

export const HooksDemo = ({
  initialMessage = "Hello from Server!",
}: HooksDemoProps) => {
  // useState hook
  const [message, setMessage] = useState(initialMessage);
  const [count, setCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // useRef hook
  const renderCount = useRef(0);
  renderCount.current++;

  // useEffect hook - runs only on client after hydration
  useEffect(() => {
    setIsClient(true);
    console.log("[HooksDemo] useEffect executed - component hydrated!");

    // Cleanup function
    return () => {
      console.log("[HooksDemo] Cleanup on unmount");
    };
  }, []);

  // useEffect with dependency
  useEffect(() => {
    if (isClient) {
      document.title = `Count: ${count}`;
    }
  }, [count, isClient]);

  // useCallback hook
  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  // useMemo hook
  const doubledCount = useMemo(() => {
    console.log("[HooksDemo] useMemo recalculating doubledCount");
    return count * 2;
  }, [count]);

  const isEven = useMemo(() => count % 2 === 0, [count]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg mx-auto mt-10">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
        React Hooks Demo
      </h2>

      {/* Hydration Status */}
      <div
        className={`mb-6 p-4 rounded-lg ${
          isClient
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}
      >
        <p className="font-semibold">
          {isClient
            ? "✅ Hydrated - Hooks are active!"
            : "⏳ Server Rendered - Waiting for hydration..."}
        </p>
        <p className="text-sm mt-1">Render count: {renderCount.current}</p>
      </div>

      {/* Message from props */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message (from server props):
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Type to test useState..."
        />
      </div>

      {/* Counter with hooks */}
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          <strong>useState + useCallback:</strong>
        </p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={decrement}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-2xl font-bold"
          >
            -
          </button>
          <span className="text-5xl font-mono font-bold text-indigo-600 min-w-[3ch]">
            {count}
          </span>
          <button
            onClick={increment}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-2xl font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* useMemo results */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">
          <strong>useMemo results:</strong>
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Doubled count:{" "}
            <span className="font-mono font-bold text-indigo-600">
              {doubledCount}
            </span>
          </li>
          <li>
            Is even:{" "}
            <span
              className={`font-bold ${
                isEven ? "text-green-600" : "text-red-600"
              }`}
            >
              {isEven ? "Yes" : "No"}
            </span>
          </li>
        </ul>
      </div>

      {/* useEffect indicator */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>💡 useEffect updates document.title with current count</p>
        <p>Check your browser tab!</p>
      </div>
    </div>
  );
};
````
