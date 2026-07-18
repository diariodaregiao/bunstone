# Bunstone

A decorator-based framework for [Bun](https://bun.sh) — the power of NestJS
without the complexity. Bunstone is **Bun-native**: HTTP runs directly on
`Bun.serve`, SQL on `Bun.SQL`, scheduling on `Bun.cron`. No Elysia, no Express.

Built for microservices and monoliths: dependency injection, HTTP with Zod
validation, guards & JWT, CQRS + event sourcing, RabbitMQ (DLQ, retries, circuit
breaker), scheduling, SSE & WebSocket, rate limiting, OpenTelemetry, OpenAPI, and
a first-class testing module.

## Install

```bash
bunx bunstone new my-app
cd my-app && bun install && bun run dev
```

Or add it to an existing project:

```bash
bun add @grupodiariodaregiao/bunstone reflect-metadata
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

@Module({ controllers: [AppController] })
class AppModule {}

const app = await Application.create(AppModule);
app.listen(3000);
```

## Documentation

The full documentation ships inside the package (under `node_modules`) so coding
agents and developers can read it locally:

- Guides: [`docs/`](./docs) — DI, modules, controllers, guards/JWT, database,
  CQRS, event sourcing, messaging, scheduling, realtime (SSE/WebSocket), rate
  limiting, observability, testing, OpenAPI, CLI.
- Full single-file reference: [`AGENTS.md`](./AGENTS.md)
- Machine-readable index: [`llms.txt`](./llms.txt)
- List every public export: `bunx bunstone exports`

Migrating from v0.7? See [`MIGRATION.md`](./MIGRATION.md).

## AI agents

`bunstone new` writes an `AGENTS.md` into your project that links to the bundled
documentation in `node_modules`, so any LLM can discover the full API on its own.

## License

MIT
