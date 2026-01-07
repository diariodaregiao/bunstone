# SQL Module

Bunstone provides a built-in SQL module that wraps [Bun's native SQL client](https://bun.sh/docs/api/sql). It is designed to be globally available once registered.

## Installation

The SQL module is part of the core `@diariodaregiao/bunstone` package.

## Registration

To use the SQL module, you must register it in your root `AppModule` using the `SqlModule.register()` method.

### Example Registration

```typescript
import { Module, SqlModule } from "@diariodaregiao/bunstone";
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
import { Injectable, SqlService } from "@diariodaregiao/bunstone";

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
