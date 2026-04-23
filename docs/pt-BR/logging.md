# Logging

O Bunstone exporta uma utility leve de `Logger` para o framework e para o código da aplicação.

## Uso Básico

```typescript
import { Logger } from "@grupodiariodaregiao/bunstone";

const logger = new Logger("UsersService");

logger.log("Service started");
logger.warn("Cache miss");
logger.error("Could not load user", { userId: 42 });
```

## Níveis de Log

Níveis disponíveis:

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

## Opções

```typescript
type LoggerOptions = {
  level?: LogLevel;
  timestamp?: boolean;
  pretty?: boolean;
};
```

- `level`: nível mínimo para imprimir. Padrão: `LogLevel.INFO`
- `timestamp`: inclui timestamp ISO. Padrão: `true`
- `pretty`: saída colorida quando `true`, JSON lines quando `false`

## Child Loggers

```typescript
const root = new Logger("App");
const http = root.child("HTTP");

http.info("Server listening");
```

## Blocos Cronometrados

```typescript
await logger.time("sync-users", async () => {
  await syncUsers();
});
```

Isso registra início/conclusão em modo debug e mede o tempo gasto.

## Logs Agrupados

```typescript
logger.group("Bootstrap", () => {
  logger.info("Loading modules");
  logger.info("Connecting to Redis");
});
```
