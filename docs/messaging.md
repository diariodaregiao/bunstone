# Messaging (RabbitMQ)

Bunstone integrates with RabbitMQ (AMQP 0-9-1) through a global `RabbitMQModule`. Consumers are declared with decorators; publishing goes through `RabbitMQService`. Delivery is resilient by default: successful handlers auto-ack, failing handlers auto-retry with backoff and finally dead-letter.

## Installation

RabbitMQ support requires the `amqplib` driver:

```bash
bun add amqplib
```

## Registration

```ts
import { Module, RabbitMQModule } from "@grupodiariodaregiao/bunstone";
import { OrderConsumer } from "./order.consumer";

@Module({
  imports: [
    RabbitMQModule.register({
      uri: "amqp://guest:guest@localhost:5672",
      prefetch: 10,
      exchanges: [{ name: "events", type: "topic", durable: true }],
      queues: [
        {
          name: "orders.created",
          durable: true,
          bindings: [{ exchange: "events", routingKey: "orders.created" }],
          deadLetterQueue: "orders.created.dlq",
        },
        { name: "orders.created.dlq" },
      ],
      retry: { maxAttempts: 3, baseDelayMs: 200 },
    }),
  ],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### Options

- `uri` — AMQP connection string.
- `prefetch` — max unacknowledged messages per consumer, which is also the handler concurrency. Default `10`. Set `0` for unlimited (not recommended: the broker will push the whole queue at once).
- `reconnect` — `{ enabled?, delayMs?, maxRetries? }`. Reconnection is on by default (`delayMs` 2000 with ±20% jitter, `maxRetries` 0 = unlimited).
- `exchanges` — `{ name, type?, durable? }[]`. `type` defaults to `"topic"`, `durable` to `true`.
- `queues` — `{ name, durable?, bindings?, deadLetterQueue? }[]`. `bindings` is `{ exchange, routingKey }[]`. When `deadLetterQueue` is set, failed messages are routed there after retries are exhausted.
- `retry` — `{ maxAttempts?, baseDelayMs?, maxDelayMs?, factor? }`. Defaults: `maxAttempts` 3, `baseDelayMs` 200, `factor` 2, `maxDelayMs` 30000.
- `circuitBreaker` — `{ failureThreshold?, cooldownMs?, successThreshold? }`. Defaults: 5 failures to open, 10s cooldown, 1 success to close.

The resolved configuration is available under the `RABBIT_OPTIONS` token, and `RabbitConnection` is injectable — its `isHealthy()` reports whether the link is currently up.

## Consuming

A consumer is a class decorated with `@RabbitConsumer()`. Each `@RabbitSubscribe({ queue })` method receives a `RabbitMessage<T>` and is registered as a provider.

```ts
import { RabbitConsumer, RabbitSubscribe, Injectable } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
@Injectable()
export class OrderConsumer {
  @RabbitSubscribe({ queue: "orders.created" })
  async onOrderCreated(message: RabbitMessage<{ orderId: string }>) {
    console.log("new order", message.data.orderId, "attempt", message.attempt);
  }
}
```

`RabbitMessage<T>` carries:

- `data` — the JSON-decoded payload (typed as `T`).
- `raw` — the raw amqplib `ConsumeMessage`.
- `attempt` — the current delivery attempt (starts at 1).

### Auto-ack, retry, and dead-lettering

You do not ack manually. When the handler **resolves**, the message is acknowledged. When it **throws**:

1. If `attempt` is below `retry.maxAttempts`, the message is moved to a **retry queue** that holds it for the backoff delay (`baseDelayMs * factor^(attempt-1)`, capped at `maxDelayMs`) and then dead-letters it back into the original queue with the attempt counter incremented.
2. Once attempts are exhausted, the message is moved to the queue's dead-letter queue. If you did not configure one, `<queue>.dlq` is created and used, so an exhausted message is never destroyed — set `deadLetterQueue` when you want a specific name or want several queues to share one.

The retry queues are declared for you, one per distinct delay, named `<queue>.retry.<delay>ms`. They carry `x-message-ttl` plus a dead-letter route back to the source queue, so **the backoff is broker state, not a timer in your process**.

The original message is acknowledged only after the broker confirms it has taken the copy. If the process dies in between, the message is still unacked and gets redelivered — nothing is lost.

When `deadLetterQueue` is set, the queue is also declared with a dead-letter route to it, so rejections the broker decides on its own — a queue TTL, a `max-length` overflow — end up in the DLQ instead of disappearing.

You can consume the dead-letter queue like any other queue by adding a `@RabbitSubscribe({ queue: "orders.created.dlq" })` handler.

Note that a consumed dead-letter queue gets a dead-letter queue of its own (`orders.created.dlq.dlq`) — the guarantee that a failed message is never destroyed applies to every consumer, including the one draining your DLQ. Keep DLQ handlers simple so that second level stays empty.

### Restart safety

Stopping the app — a deploy, `SIGTERM`, a crash — and starting it again resumes exactly where it left off:

- **In-flight handlers** are drained on shutdown. Consumers are cancelled first so no new message is delivered, then the app waits for running handlers (up to `shutdownTimeoutMs`, default 10s) before closing the channels.
- **Messages waiting on a backoff** live in their retry queue on the broker. They come back on their own when the TTL expires, whether or not the app was running at the time.
- **Anything unacked** when the process died is redelivered by the broker on the next connection.

Delivery is at-least-once: a crash between a handler's side effect and its ack means the message is delivered again. Handlers should be idempotent.

### Circuit breaker

If the framework cannot move a failed message to its retry or dead-letter queue — the target was deleted, for instance — the message is left on the queue and consumption pauses briefly instead of spinning through immediate redeliveries.

Each subscription is wrapped in its own **circuit breaker**. After repeated failures it opens and **pauses consumption of that queue** for the cooldown — the consumer is cancelled and messages stay on the broker instead of burning through their retries against a dependency that is down. When the cooldown elapses the consumer re-registers and the next message decides whether the circuit closes or opens again. Defaults: 5 failures to open, 10s cooldown, 1 success to close.

Because each subscription has its own breaker and its own channel, one misbehaving consumer never affects the others.

`CircuitBreaker` is exported and usable on its own for any call you want to protect — an outbound HTTP dependency, for example:

```ts
import { CircuitBreaker, CircuitOpenError } from "@grupodiariodaregiao/bunstone";

const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 5000 });

try {
  const result = await breaker.execute(() => fetch(url));
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // short-circuited: the dependency is known to be down
  }
}
```

The retry helpers (`backoffDelay`, `shouldRetry`, `DEFAULT_RETRY`) and the topology helpers (`retryQueueName`, `retryDelays`) are exported too, which is what the module itself uses to derive queue names.

### Reconnection

Each consumer runs on its own channel, and both connection-level and channel-level failures trigger a full re-establish: the module reconnects and **re-registers all consumers and topology** (exchanges, queues, bindings, retry queues), so subscriptions resume without manual intervention. Reconnect attempts are jittered to avoid a stampede when many replicas restart at once.

`RabbitConnection` exposes `isHealthy()`, reporting whether the link is currently up.

Be deliberate about where you use it. Under an orchestrator that **restarts** unhealthy containers — a Docker Swarm `healthcheck`, for instance — pointing the check at broker connectivity turns a broker outage into a restart loop across every replica, and restarting does not bring the broker back. The built-in reconnect already handles the outage, so keep the container healthcheck on `/health` and let the app stay up while it retries.

Wire `isHealthy()` in only where "not ready" means *stop sending me traffic* rather than *kill me* — for example a readiness endpoint an external load balancer polls:

```ts
const app = await Application.create(AppModule, {
  health: {
    checks: [() => rabbitConnection.isHealthy()],
  },
});
```

## Publishing

Inject `RabbitMQService` to publish. Messages are JSON-encoded and `persistent` by default.

```ts
import { Injectable, RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(orderId: string) {
    await this.rabbit.publish("events", "orders.created", { orderId });
  }

  async notify(text: string) {
    await this.rabbit.sendToQueue("notifications", { text });
  }
}
```

- `publish(exchange, routingKey, message, options?)` — publish to an exchange.
- `sendToQueue(queue, message, options?)` — send straight to a queue.

Both publish on a **confirm channel**: the promise resolves only once the broker has acknowledged the message.

`sendToQueue` is also `mandatory` — a queue that does not exist is always a mistake, and the broker acknowledges unroutable messages, so without this the message would vanish while your `await` reported success.

`publish` is **not** mandatory by default, because publishing an event to a topic exchange nobody has bound yet is a normal state during a rollout. Pass `mandatory: true` when the message must reach a queue:

```ts
await this.rabbit.publish("events", "orders.created", payload, { mandatory: true });
```

Publishing while the broker is unreachable rejects after a timeout instead of hanging indefinitely, so an HTTP handler is never pinned for the length of an outage.
