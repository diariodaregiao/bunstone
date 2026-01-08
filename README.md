# Bunstone Framework

Bunstone is a high-performance, decorator-based web framework for [Bun](https://bun.sh), inspired by NestJS and built on top of [ElysiaJS](https://elysiajs.com). It brings powerful Dependency Injection, CQRS, Sagas, and modular architecture to the Bun ecosystem.

## Code organization and formatting

This project uses `Prettier` to keep the code organized and follow a single standard, thereby improving code evolution and maintenance.

Remember that before uploading your code, run the following commands:

```cmd
  bun run format
  bun run format:check
```

Because your PR will only be approved if it passes the CI, don't forget.

## 🚀 Quick Start

Scaffold a new project in seconds:

```bash
npx @diariodaregiao/bunstone my-app
cd my-app
bun dev
```

## 🏗️ Core Concepts

### Modular Architecture

Organize your application into modules using the `@Module` decorator.

```typescript
@Module({
  imports: [UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Dependency Injection

Bunstone features a recursive DI container that handles singletons and nested dependencies automatically.

```typescript
@Injectable()
export class AppService {
  getHello() {
    return "Hello World!";
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
}
```

## 🛠️ Features

- **CQRS**: Built-in Command, Query, and Event buses.
- **Sagas**: Reactive event-to-command streams.
- **Guards & JWT**: Easy route protection and JWT integration.
- **Zod Validation**: Automatic request body/param validation.
- **Scheduling**: Decorator-based Cron jobs and Timeouts.
- **Adapters**: Built-in support for Form-Data, File Uploads, and Caching.

## 📚 Examples

We have a set of examples demonstrating various features of the framework:

| Example                                                   | Description                          |
| --------------------------------------------------------- | ------------------------------------ |
| [Basic App](./examples/01-basic-app/index.ts)             | Modules, Controllers, and simple DI  |
| [Routing & Params](./examples/02-routing-params/index.ts) | Extracting data and Zod validation   |
| [Guards & Auth](./examples/03-guards-auth/index.ts)       | JWT and custom Guard implementations |
| [CQRS](./examples/04-cqrs/index.ts)                       | Command Bus and Handlers             |
| [SQL Database](./examples/05-database-sql/index.ts)       | Database registration and usage      |
| [Scheduling](./examples/06-scheduling/index.ts)           | Periodic tasks and delayed execution |
| [Adapters](./examples/07-adapters/index.ts)               | Cache and Form-Data handling         |
| [OpenAPI](./examples/08-openapi/index.ts)                 | Swagger documentation setup          |

## 📖 Documentation

Visit our [Documentation Website](https://diariodaregiao.github.io/bunstone) (if hosted) or run it locally:

```bash
bun run docs:dev
```

### Guide

- [Dependency Injection](./docs/dependency-injection.md)
- [Routing & Parameters](./docs/routing-params.md)
- [CQRS & Sagas](./docs/cqrs.md)
- [Guards & JWT](./docs/guards-jwt.md)
- [Scheduling (Cron/Timeout)](./docs/scheduling.md)
- [Adapters](./docs/adapters/form-data.md)

## 📄 License

MIT
