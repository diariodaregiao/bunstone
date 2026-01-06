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

- If `DATABASE_URL` is set, it will be used as the main connection string.
  Otherwise, the other values `(HOSTNAME, PORT, USERNAME, PASSWORD, NAME)` will be used to build the connection.

### Shared methods

The following methods are exported:

- `Query`: Performs a query on the database, receives a tagged template function representing the SQL as a parameter and returns an array in which each line of the query is an object.
- `Transaction`: Executes a block of code within a transaction, If an error occurs, the transaction will be automatically rolled back, receives template function representing SQL and returns void.

### Info about types:

The typing of methods uses the same typing as bun for interactions with the database.

This decision was made for security reasons, as bun typing offers security features such as protection.

### custom database options

Settings such as `connections pool`, `connectionTimeout`, `tls`, etc., are the defaults defined by bun.
See more at [connection-option](https://bun.com/docs/runtime/sql#connection-options).
