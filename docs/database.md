# Database (SQL)

Bunstone wraps [Bun's native SQL client](https://bun.sh/docs/api/sql) in a small, injectable service. Register the module once and inject `SqlService` anywhere.

`SqlModule` is a **global** module: registering it in your root module makes `SqlService` available everywhere without re-importing.

## Registration

`SqlModule.register()` accepts either a connection-options object or a connection URL. Any relational database Bun.SQL supports works — `postgres`, `mysql`, `mariadb`, or `sqlite`.

```ts
import { Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { UsersRepository } from "./users.repository";

@Module({
  imports: [
    SqlModule.register({
      adapter: "mysql",
      hostname: "localhost",
      port: 3306,
      username: "root",
      password: "secret",
      database: "app",
    }),
  ],
  providers: [UsersRepository],
})
export class AppModule {}
```

Or with a URL:

```ts
SqlModule.register("mysql://root:secret@localhost:3306/app");
```

### Options

| Option | Type | Description |
|---|---|---|
| `adapter` | `"postgres" \| "mysql" \| "mariadb" \| "sqlite"` | Database driver |
| `hostname` | `string` | Host |
| `port` | `number` | Port |
| `username` | `string` | User |
| `password` | `string` | Password |
| `database` | `string` | Database name |
| `filename` | `string` | SQLite file (e.g. `:memory:`) |
| `timezone` | `string` | Session timezone (default `"utc"`) |
| `max` | `number` | Max pool connections |
| `idleTimeout` | `number` | Idle connection timeout |
| `maxLifetime` | `number` | Max connection lifetime |
| `connectionTimeout` | `number` | Connection timeout |

The connection pool is closed automatically on application shutdown.

## SqlService

Inject `SqlService` into any provider or controller.

```ts
import { Injectable, SqlService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersRepository {
  constructor(private readonly sql: SqlService) {}

  create(name: string, age: number) {
    return this.sql.query("INSERT INTO users (name, age) VALUES (?, ?)", [name, age]);
  }

  findByName(name: string) {
    return this.sql.queryOne<{ id: number; name: string; age: number }>(
      "SELECT * FROM users WHERE name = ?",
      [name],
    );
  }
}
```

### Methods

- `query<T>(sql, params?)` — runs a statement and returns `T[]`.
- `queryOne<T>(sql, params?)` — returns the first row as `T`, or `null` when nothing matches.
- `transaction(fn)` — runs `fn` inside a transaction, committing on success and rolling back if it throws. The callback receives a transaction client whose `.unsafe(sql, params)` runs statements on the same transaction.
- `client` — the underlying `Bun.SQL` instance for advanced use.

### Raw client access

`SqlService.client` is the underlying `Bun.SQL` instance. The same object is registered under the `SQL_CLIENT` token, so you can inject it directly when you want the driver without the wrapper:

```ts
import { Inject, Injectable, SQL_CLIENT } from "@grupodiariodaregiao/bunstone";
import type { SQL } from "bun";

@Injectable()
export class Reports {
  constructor(@Inject(SQL_CLIENT) private readonly sql: SQL) {}
}
```

### Parameterized queries

Bind values with placeholders instead of string interpolation to stay safe from injection. MySQL, MariaDB, and SQLite use `?`:

```ts
await this.sql.query("SELECT * FROM users WHERE age > ?", [18]);
```

Postgres uses numbered placeholders (`$1`, `$2`, ...):

```ts
await this.sql.query("SELECT * FROM users WHERE age > $1", [18]);
```

### Transactions

```ts
await this.sql.transaction(async (tx) => {
  await tx.unsafe("INSERT INTO users (name, age) VALUES (?, ?)", ["ada", 36]);
  await tx.unsafe("INSERT INTO logs (message) VALUES (?)", ["user created"]);
});
```

If the callback throws, the whole transaction is rolled back.

## MongoDB

`MongoModule` connects to MongoDB for use by [the event store](./event-sourcing.md) or by your own read models. The `mongodb` driver is an **optional peer dependency**: install it only if you use this module.

```bash
bun add mongodb
```

```ts
import { Module, MongoModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [MongoModule.register("mongodb://localhost:27017/app")],
})
export class AppModule {}
```

Or with options:

```ts
MongoModule.register({
  uri: "mongodb://localhost:27017",
  database: "app",
  client: { maxPoolSize: 20 },      // passed verbatim to the driver
});
```

You can also hand over a client you built yourself — Bunstone will use it and never close it:

```ts
MongoModule.register({ client: myMongoClient, database: "app" });
```

### MongoService

```ts
import { Inject, Injectable, MongoService } from "@grupodiariodaregiao/bunstone";
import type { Db } from "mongodb";

@Injectable()
export class OrdersReadModel {
  constructor(private readonly mongo: MongoService) {}

  async recent() {
    const db = await this.mongo.db<Db>();
    return db.collection("orders").find().limit(20).toArray();
  }
}
```

- `db<TDb>(name?)` — the configured database, or another one by name.
- `client<TClient>()` — the underlying `MongoClient`.
- `connected` — whether the link is up; suitable as a readiness check.

The database name comes from `database`, else the path in the URI, else `bunstone`. The connection is opened during startup, so a bad URI fails the boot rather than the first query, and it is closed on shutdown.

Bunstone's own types never name `mongodb`, so a project that only uses SQL typechecks without the driver installed. Pass your own generic (`db<Db>()`) to get the driver's types where you want them.

> **Bundling:** if you bundle with dependencies inlined, pass `--packages external` (or `--external mongodb`), otherwise the bundler tries to resolve the optional driver even on the SQL backend.
