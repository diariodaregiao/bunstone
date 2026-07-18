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
