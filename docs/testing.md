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
