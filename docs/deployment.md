# Deployment: health checks & graceful shutdown

## Health & readiness endpoints

Enable built-in `/health` (liveness) and `/ready` (readiness) endpoints — useful
for Kubernetes probes and load balancers.

```ts
const app = await Application.create(AppModule, { health: true });
app.listen(3000);
```

- `GET /health` → always `200 { "status": "ok" }` while the process is up.
- `GET /ready` → `200 { "status": "ready" }` when the app is listening and not
  shutting down; `503 { "status": "not_ready" }` otherwise.

Add custom readiness checks (e.g. a dependency must be reachable). `/ready`
returns `503` if any check returns `false`:

```ts
await Application.create(AppModule, {
  health: {
    path: "/health",
    readyPath: "/ready",
    checks: [async () => sql.isConnected()],
  },
});
```

A check that *throws* counts as not ready — `/ready` answers `503`, never a `500`.

Mounting a controller on `/health`, `/ready`, `/openapi.json` or `/docs` while the matching built-in is enabled raises a configuration error at startup instead of silently replacing your route.

**Under Docker Swarm**, remember that an unhealthy container is *restarted*, not just removed from routing. Point the container `healthcheck` at `/health` and keep dependency probes (database, broker) out of it — restarting a container does not fix a broker that is down, and tying the two together turns an outage into a restart loop across every replica. Use `/ready` with dependency checks only where "not ready" means *stop sending traffic*, such as an external load balancer.

## Graceful shutdown

On `SIGINT`/`SIGTERM` (or `app.close()`), Bunstone shuts down cleanly:

1. `/ready` starts returning `503` so orchestrators stop routing new traffic.
2. In-flight HTTP requests are **drained** (allowed to finish).
3. `onModuleDestroy` hooks run; schedulers, queue consumers, the SQL pool and
   other resources are released.

```ts
await Application.create(AppModule, {
  health: true,
  shutdownGraceMs: 3000,     // wait before draining, so probes notice /ready=503
  shutdownTimeoutMs: 10000,  // force-close if draining exceeds this
});
```

- `shutdownGraceMs` — delay between marking the app not-ready and draining
  (gives the orchestrator time to stop sending traffic). Default `0`.
- `shutdownTimeoutMs` — maximum drain time before connections are force-closed
  (long-lived WebSocket connections are closed at this point). Default `10000`.

For zero-downtime rolling deploys, set `shutdownGraceMs` to a couple of seconds
and configure your orchestrator's `preStop` / termination grace period to match.
