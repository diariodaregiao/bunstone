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

### Connection options

You can pass a second argument with pool and client settings. Bunstone forwards only the supported options to [Bun.SQL](https://bun.sh/docs/api/sql):

```typescript
@Module({
  imports: [
    SqlModule.register("mysql://user:pass@host:3306/db", {
      maxLifetime: 25200,
      connectionTimeout: 30,
      max: 10,
      timezone: "UTC",
    }),
  ],
})
export class AppModule {}
```

The same options can be combined with the object-style registration:

```typescript
SqlModule.register({
  provider: "postgresql",
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password",
  database: "my_db",
  max: 20,
  idleTimeout: 30,
});
```

For backward compatibility, the second argument may still be a timezone string:

```typescript
SqlModule.register("mysql://user:pass@host/db", "UTC");
```

#### Supported options (`SqlModuleOptions`)

| Option | Description |
|---|---|
| `timezone` | Bunstone helper for date/time handling. Defaults to `UTC`. Mapped to driver `connection` settings. |
| `max` | Maximum connections in the pool |
| `maxLifetime` | Maximum connection lifetime in seconds |
| `connectionTimeout` | Timeout when establishing a connection (seconds) |
| `idleTimeout` | Close idle connections after N seconds |
| `connection` | Driver-specific runtime settings (e.g. PostgreSQL `TimeZone`) |
| `tls` | TLS/SSL configuration |
| `prepare` | Enable automatic prepared statements |
| `bigint` | Return out-of-range integers as `BigInt` |
| `onconnect` | Callback when a connection attempt completes |
| `onclose` | Callback when a connection closes |
| `path` | Unix domain socket path |
| `readonly` | SQLite read-only mode |
| `create` | SQLite create-if-missing behavior |
| `safeIntegers` | SQLite safe integer handling |
| `strict` | SQLite strict mode |

Only the options listed above are accepted. Invalid keys are rejected by TypeScript and also throw `DatabaseError` (`BNS-DB-003`) at runtime.

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
