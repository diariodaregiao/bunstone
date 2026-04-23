# Logging

Bunstone exports a lightweight `Logger` utility for framework internals and application code.

## Basic Usage

```typescript
import { Logger } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("UsersService");

logger.log("Service started");
logger.warn("Cache miss");
logger.error("Could not load user", { userId: 42 });
```

## Log Levels

Available levels:

- `LogLevel.DEBUG`
- `LogLevel.INFO`
- `LogLevel.WARN`
- `LogLevel.ERROR`
- `LogLevel.FATAL`

```typescript
import { Logger, LogLevel } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("Worker", {
  level: LogLevel.DEBUG,
});
```

## Options

```typescript
type LoggerOptions = {
  level?: LogLevel;
  timestamp?: boolean;
  pretty?: boolean;
};
```

- `level`: minimum level to print. Default: `LogLevel.INFO`
- `timestamp`: include ISO timestamp. Default: `true`
- `pretty`: pretty colored output when `true`, JSON lines when `false`

## Child Loggers

```typescript
const root = new Logger("App");
const http = root.child("HTTP");

http.info("Server listening");
```

## Timed Blocks

```typescript
await logger.time("sync-users", async () => {
  await syncUsers();
});
```

This logs start/completion in debug mode and records elapsed time.

## Grouped Logs

```typescript
logger.group("Bootstrap", () => {
  logger.info("Loading modules");
  logger.info("Connecting to Redis");
});
```
