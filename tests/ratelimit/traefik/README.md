# Traefik rate limit e2e

End-to-end checks for rate limiting behind Traefik with two application replicas.

## Prerequisites

- Docker with Compose v2
- Port `9876` free on the host

## Run manually

```bash
cd tests/ratelimit/traefik

# Default: trustProxy=true, MemoryStorage, max=5
docker compose up -d --build --wait
curl -i http://127.0.0.1:9876/api/limited
docker compose down -v

# Without trustProxy — every client shares one bucket
TRUST_PROXY=false docker compose up -d --build --wait --force-recreate
# Six requests from the same host should yield 429 on the sixth
for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9876/api/limited; done
docker compose down -v

# Shared Redis across replicas — fleet-wide cap
USE_REDIS=true TRUST_PROXY=true REDIS_KEY_PREFIX=bunstone:traefik:manual: docker compose up -d --build --wait --force-recreate
for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9876/api/limited; done
docker compose down -v
```

## Automated test

```bash
bun test tests/ratelimit/traefik.e2e.test.ts
```

Skips automatically when Docker Compose is unavailable.

## Expected scenarios

| Scenario | Setup | Expected |
|----------|-------|----------|
| No trustProxy | `TRUST_PROXY=false` | All clients share one bucket; 6th request → 429 |
| trustProxy | `TRUST_PROXY=true`, two curl containers on the Docker network | Each client IP gets its own bucket |
| Forged X-Forwarded-For | Client sends fake XFF through Traefik | Does not bypass the limit |
| Two replicas + Memory | `USE_REDIS=false`, max=5 | Up to ~10 requests succeed (max × replicas) |
| Two replicas + Redis | `USE_REDIS=true`, max=5 | 6th request → 429 fleet-wide |
| Headers via Traefik | Any 429 response | `Retry-After` and `X-RateLimit-*` present |

Only port **9876** (Traefik) is published; application ports stay on the internal network.
