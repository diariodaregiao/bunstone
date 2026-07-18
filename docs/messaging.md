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
- `prefetch` — max unacknowledged messages per channel.
- `reconnect` — `{ enabled?, delayMs?, maxRetries? }`. Reconnection is on by default (`delayMs` 2000, `maxRetries` 0 = unlimited).
- `exchanges` — `{ name, type?, durable? }[]`. `type` defaults to `"topic"`, `durable` to `true`.
- `queues` — `{ name, durable?, bindings?, deadLetterQueue? }[]`. `bindings` is `{ exchange, routingKey }[]`. When `deadLetterQueue` is set, failed messages are routed there after retries are exhausted.
- `retry` — `{ maxAttempts?, baseDelayMs?, maxDelayMs?, factor? }`. Defaults: `maxAttempts` 3, `baseDelayMs` 200, `factor` 2, `maxDelayMs` 30000.

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

1. If `attempt` is below `retry.maxAttempts`, the message is re-enqueued after a backoff delay (`baseDelayMs * factor^(attempt-1)`, capped at `maxDelayMs`), with the attempt counter incremented.
2. Once attempts are exhausted, the message is sent to the queue's `deadLetterQueue` if one is configured; otherwise the failure is logged.

You can consume the dead-letter queue like any other queue by adding a `@RabbitSubscribe({ queue: "orders.created.dlq" })` handler.

### Circuit breaker

Each subscription is wrapped in its own **circuit breaker**. After repeated failures it opens and short-circuits calls to that handler for a cooldown, then half-opens to test recovery before closing again. This isolates a misbehaving consumer without affecting the others. Defaults: 5 failures to open, 10s cooldown, 1 success to close.

### Reconnection

On connection loss the module reconnects automatically and **re-registers all consumers and topology** (exchanges, queues, bindings), so subscriptions resume without manual intervention.

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
