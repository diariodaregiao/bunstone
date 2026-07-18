# Getting Started

This guide walks through creating a Bunstone application from scratch.

## Scaffold a project

The fastest way to start is the CLI:

```bash
bunx bunstone new my-app
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
