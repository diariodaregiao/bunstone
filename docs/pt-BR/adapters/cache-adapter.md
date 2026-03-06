# Adaptador de cache (Redis)

O `CacheAdapter` é uma pequena abstração sobre o cliente Redis nativo do Bun, focada em:

- `set` (permanente ou com TTL)
- `get` (tipado, sempre retorna um objeto)
- `exists`
- `remove`

## Importação

```ts
import { CacheAdapter } from "@grupodiariodaregiao/bunstone";
```

## Configuração

Por padrão, ele usa o cliente global `redis` do Bun (lê `REDIS_URL` / `VALKEY_URL`).

```ts
const cache = new CacheAdapter();
```

Ou passe uma URL de conexão personalizada:

```ts
const cache = new CacheAdapter({ url: "redis://localhost:6379" });
```

## Set

```ts
await cache.set("user:1", { id: 1, name: "Alice" }, { permanent: true });
await cache.set("session:123", { userId: 1 }, { ttlSeconds: 60 * 60 }); // 1 hora
```

## Get (tipado)

`get<T>()` faz o parse de JSON automaticamente e sempre retorna um objeto (se a chave não existir, retorna `{}`).

```ts
type UserCache = { id: number; name: string };
const user = await cache.get<UserCache>("user:1");
```

## Exists / Remove

```ts
const exists = await cache.exists("user:1");
await cache.remove("user:1");
```

## Exemplo prático

Veja como usar o Cache Adapter em um controller:

<<< @/../examples/07-adapters/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
