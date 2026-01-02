# PR: Add upload + cache adapters (Bun native S3/Redis)

## Summary

- Added `UploadAdatper` (MinIO/S3) with `upload`, `exists`, `remove` using Bun's native S3 API.
- Added `CacheAdatper` (Redis) with `set` (permanent/TTL), `get<T>()` (auto JSON parse, always returns an object), `exists`, `remove` using Bun's native Redis client.
- Added docs:
  - `docs/adapters/upload-adapter.md`
  - `docs/adapters/cache-adapter.md`

## Usage

### UploadAdatper (MinIO)

```ts
import { UploadAdatper } from "@diariodaregiao/bunstone";

const upload = new UploadAdatper({
  endpoint: "http://localhost:9000",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  bucket: "my-bucket",
});
```

### CacheAdatper (Redis)

```ts
import { CacheAdatper } from "@diariodaregiao/bunstone";

const cache = new CacheAdatper(); // uses REDIS_URL / VALKEY_URL
await cache.set("user:1", { id: 1, name: "Alice" }, { ttlSeconds: 3600 });
const user = await cache.get<{ id: number; name: string }>("user:1");
```
