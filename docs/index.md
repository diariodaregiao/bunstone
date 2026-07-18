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
