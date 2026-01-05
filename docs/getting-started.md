# Getting Started

Bunstone is a decorator-based framework for Bun, inspired by NestJS. It provides a structured way to build scalable and maintainable APIs.

## Installation

You can scaffold a new project using our CLI:

```bash
npx @diariodaregiao/bunstone my-app
```

Or install it in an existing project:

```bash
bun add @diariodaregiao/bunstone
```

## Basic Setup

Create an `index.ts` file:

```typescript
import { AppStartup, Module, Controller, Get } from "@diariodaregiao/bunstone";

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

AppStartup.create(AppModule).listen(3000);
```

## Running the App

```bash
bun run index.ts
```

Your app will be running at `http://localhost:3000`.
