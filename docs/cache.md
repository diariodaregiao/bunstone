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

## API

- `get<T>(key)` — returns the parsed value or `null`.
- `set(key, value, { ttlSeconds? })` — stores a JSON value, optionally with a TTL.
- `has(key)` — `true` if the key exists.
- `delete(key)` — removes a key.
- `getOrSet<T>(key, factory, { ttlSeconds? })` — returns the cached value, or
  computes it with `factory`, caches it, and returns it.
- `client` — the underlying Bun `RedisClient` for advanced commands.
