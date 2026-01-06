# DbWrapper

dbWrapper is a utility object for interacting with the database using Bun SQL

### Inicialization

- To use DbWrapper, you need to set the following environment variables for database connection:

```
  DATABASE_URL=
  DATABASE_ADAPTER=
  DATABASE_HOSTNAME=
  DATABASE_PORT=
  DATABASE_USERNAME=
  DATABASE_PASSWORD=
  DATABASE_NAME=
```

- `DATABASE_URL` is required and used as the main connection string.
- The other values `(ADAPTER, HOSTNAME, PORT, USERNAME, PASSWORD, NAME)` are used as connection options.

### Shared methods

The following methods are exported:

- `query`: Performs a query on the database. Receives a builder function that gets a Bun SQL tagged-template function.
- `transaction`: Executes a block of code within a transaction. If an error occurs, the transaction will be automatically rolled back.

### Usage

Import:

```ts
import { dbWrapper } from "@diariodaregiao/bunstone";
```

Query example:

```ts
type UserRow = { id: number; name: string };

const users = (await dbWrapper.query(async (sql) => {
  return await sql`SELECT id, name FROM users`;
})) as UserRow[];
```

Query with parameters (safe binding):

```ts
const userId = 123;

const user = (await dbWrapper.query(async (sql) => {
  return await sql`SELECT id, name FROM users WHERE id = ${userId}`;
})) as Array<{ id: number; name: string }>;
```

Transaction example:

```ts
await dbWrapper.transaction(async (trx) => {
  await trx`INSERT INTO users (name) VALUES (${"Alice"})`;
  await trx`UPDATE counters SET value = value + 1 WHERE name = ${"users"}`;
});
```

### Info about types:

The typing of methods uses the same typing as bun for interactions with the database.

This decision was made for security reasons, as bun typing offers security features such as protection.

### custom database options

Settings such as `connections pool`, `connectionTimeout`, `tls`, etc., are the defaults defined by bun.
See more at [connection-option](https://bun.com/docs/runtime/sql#connection-options).
