# Cache

`CacheModule` provides a Redis-backed cache using **Bun's native Redis client**
(works with Redis and Valkey). Register it once, then inject `CacheService`.

## Setup

```ts
import { CacheModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CacheModule.register({ url: "redis://localhost:6379" })],
})
export class AppModule {}
```

If `url` is omitted, the client reads `REDIS_URL` / `VALKEY_URL`, falling back to
`redis://localhost:6379`. The connection is closed automatically on shutdown.

## Usage

`CacheService` serializes values as JSON.

```ts
import { CacheService, Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersService {
  constructor(private readonly cache: CacheService) {}

  async getUser(id: string) {
    return this.cache.getOrSet(
      `user:${id}`,
      () => this.loadFromDb(id),
      { ttlSeconds: 60 },
    );
  }

  private loadFromDb(id: string) {
    return { id, name: "Ada" };
  }
}
```

## Raw client access

`CacheService.client` is the underlying Bun `RedisClient`, also registered under the `CACHE_CLIENT` token for direct injection when you need a command the service does not wrap:

```ts
import { CACHE_CLIENT, Inject, Injectable } from "@grupodiariodaregiao/bunstone";
import type { RedisClient } from "bun";

@Injectable()
export class Leaderboard {
  constructor(@Inject(CACHE_CLIENT) private readonly redis: RedisClient) {}
}
```

## API

- `get<T>(key)` — returns the parsed value or `null`.
- `set(key, value, { ttlSeconds? })` — stores a JSON value, optionally with a TTL. A fractional TTL is rounded down; `0` or a negative TTL means "already expired" and removes the key; a non-finite TTL (a `NaN` from a computed expiry, for example) is ignored and the value is stored without expiry rather than silently deleted.
- `has(key)` — `true` if the key exists.
- `delete(key)` — removes a key.
- `getOrSet<T>(key, factory, { ttlSeconds? })` — returns the cached value, or
  computes it with `factory`, caches it, and returns it. A cached `null` counts
  as a hit, so negative results are cached too. A value that is not valid JSON
  (written by something other than this service) is treated as a miss and
  recomputed rather than throwing on every read.

`getOrSet` does not lock: concurrent callers on a cold key each run the factory. Add your own coordination if the factory is expensive enough that a stampede matters.
- `client` — the underlying Bun `RedisClient` for advanced commands.
