# Getting Started

Bunstone is a decorator-based framework for Bun, inspired by NestJS. It provides a structured way to build scalable and maintainable APIs.

## Installation

You can scaffold a new project using our CLI:

```bash
bunx @grupodiariodaregiao/bunstone new my-app
# or shorthand
bunx @grupodiariodaregiao/bunstone my-app
```

## Basic Setup

Bunstone projects follow a modular structure. Here's a basic setup:

### `src/main.ts`

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = AppStartup.create(AppModule);
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
