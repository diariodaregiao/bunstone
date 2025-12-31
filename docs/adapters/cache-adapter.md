# Cache adapter (Redis)

The `CacheAdatper` is a small abstraction on top of Bun's native Redis client, focused on:

- `set` (permanent or with TTL)
- `get` (typed, always returns an object)
- `exists`
- `remove`

## Import

```ts
import { CacheAdatper } from "@diariodaregiao/bunstone";
```

## Setup

By default it uses Bun's global `redis` client (reads `REDIS_URL` / `VALKEY_URL`).

```ts
const cache = new CacheAdatper();
```

Or pass a custom connection URL:

```ts
const cache = new CacheAdatper({ url: "redis://localhost:6379" });
```

## Set

```ts
await cache.set("user:1", { id: 1, name: "Alice" }, { permanent: true });
await cache.set("session:123", { userId: 1 }, { ttlSeconds: 60 * 60 }); // 1 hour
```

## Get (typed)

`get<T>()` parses JSON automatically and always returns an object (if the key is missing, it returns `{}`).

```ts
type UserCache = { id: number; name: string };
const user = await cache.get<UserCache>("user:1");
```

## Exists / Remove

```ts
const exists = await cache.exists("user:1");
await cache.remove("user:1");
```
