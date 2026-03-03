# RabbitMQ Module

The `@grupodiariodaregiao/bunstone` RabbitMQ module provides first-class support for publishing and consuming messages via [RabbitMQ](https://www.rabbitmq.com/) (AMQP 0-9-1).

## Installation

```bash
bun add amqplib
bun add -d @types/amqplib
```

## Setup

Register `RabbitMQModule` once in your root `AppModule`. The module is **global** so `RabbitMQService` is injectable everywhere without re-importing the module.

```typescript
import { Module } from "@grupodiariodaregiao/bunstone";
import { RabbitMQModule } from "@grupodiariodaregiao/bunstone/lib/rabbitmq/rabbitmq-module";

@Module({
  imports: [
    RabbitMQModule.register({
      uri: "amqp://guest:guest@localhost:5672",

      exchanges: [
        { name: "events", type: "topic", durable: true },
      ],

      queues: [
        {
          name: "orders.created",
          durable: true,
          bindings: { exchange: "events", routingKey: "orders.created.*" },
        },
      ],

      prefetch: 10,
    }),
  ],
})
export class AppModule {}
```

### Connection options

| Option | Type | Default | Description |
|---|---|---|---|
| `uri` | `string` | – | Full AMQP URI. Takes precedence over individual fields. |
| `host` | `string` | `"localhost"` | Broker hostname |
| `port` | `number` | `5672` | Broker port |
| `username` | `string` | `"guest"` | AMQP username |
| `password` | `string` | `"guest"` | AMQP password |
| `vhost` | `string` | `"/"` | Virtual host |
| `exchanges` | `RabbitMQExchangeConfig[]` | `[]` | Exchanges to assert at startup |
| `queues` | `RabbitMQQueueConfig[]` | `[]` | Queues to assert & bind at startup |
| `prefetch` | `number` | `10` | Unacked message limit per consumer channel |
| `reconnect.enabled` | `boolean` | `true` | Reconnect on connection loss |
| `reconnect.delay` | `number` | `2000` | ms between reconnection attempts |
| `reconnect.maxRetries` | `number` | `10` | Max attempts (0 = unlimited) |

---

## Declaring Exchanges

```typescript
exchanges: [
  {
    name: "orders",
    type: "topic",      // "direct" | "topic" | "fanout" | "headers"
    durable: true,      // survives broker restart (default: true)
    autoDelete: false,  // delete when no bindings remain (default: false)
  },
]
```

## Declaring Queues

```typescript
queues: [
  {
    name: "orders.created",
    durable: true,

    // Bind to one exchange
    bindings: { exchange: "orders", routingKey: "orders.created.*" },

    // Or bind to multiple exchanges
    // bindings: [
    //   { exchange: "orders",  routingKey: "orders.created.*" },
    //   { exchange: "audit",   routingKey: "#" },
    // ],

    // Dead letter exchange for rejected/expired messages
    deadLetterExchange: "orders.dlx",
    deadLetterRoutingKey: "orders.dead",

    messageTtl: 60_000,  // message expiry in ms
    maxLength: 10_000,   // cap queue depth
  },
]
```

---

## Consuming Messages

A **consumer** is a class decorated with `@RabbitConsumer()` that contains methods decorated with `@RabbitSubscribe()`.

There are three subscription modes:

| Mode | When to use |
|---|---|
| **Queue mode** – `{ queue: "..." }` | Consume from a pre-declared, persistent queue. The handler receives **every** message that arrives on that queue, regardless of routing key. |
| **Queue + routing key filter** – `{ queue: "...", routingKey: "..." }` | Consume from a pre-declared queue but **only dispatch** messages whose routing key matches the declared pattern. Messages that don't match are silently acked. |
| **Exchange / routing key mode** – `{ exchange: "...", routingKey: "..." }` | The lib creates an exclusive auto-delete queue per handler and binds it to the exchange. Every handler for the same routing key gets its own copy (broker-level fan-out). |

### Queue mode – in-process fan-out

When **multiple handlers** (in the same or different `@RabbitConsumer` classes) subscribe to the **same queue name**, the lib creates a **single** AMQP consumer and delivers each message to **all handlers** in turn.

```typescript
@RabbitConsumer()
export class Consumer1 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEIVED 1", msg.data);
    msg.ack(); // only the first ack/nack/reject call takes effect
  }
}

@RabbitConsumer()
export class Consumer2 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEIVED 2", msg.data);
    msg.ack(); // no-op: message was already settled above
  }
}
```

### Queue mode with routing key filter

Add `routingKey` to a queue-mode subscription to make it **selective**: the handler is only called when the incoming message's routing key matches the declared pattern. Messages that don't match any handler are **silently acknowledged** so they don't pile up as unacked.

This is useful when a single durable queue receives multiple event types (e.g. `article.*`) but different handlers should react only to specific ones.

```typescript
RabbitMQModule.register({
  exchanges: [{ name: "articles", type: "topic", durable: true }],
  queues: [
    {
      name: "article",
      durable: true,
      bindings: { exchange: "articles", routingKey: "article.*" },
    },
  ],
})
```

```typescript
@RabbitConsumer()
export class ArticleConsumer {

  // ✅ Only called when routingKey === "article.published"
  @RabbitSubscribe({ queue: "article", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("published", msg.data.articleId);
    msg.ack();
  }

  // ✅ Only called when routingKey === "article.deleted"
  @RabbitSubscribe({ queue: "article", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("deleted", msg.data.articleId);
    msg.ack();
  }

  // ✅ No routingKey → called for EVERY message on the queue
  @RabbitSubscribe({ queue: "article" })
  async onAll(msg: RabbitMessage<{ articleId: string }>) {
    console.log("any event", msg.raw.fields.routingKey, msg.data.articleId);
    msg.ack();
  }
}
```

> **Wildcard patterns** – `routingKey` supports the same `*` (one word) and `#` (zero or more words) wildcards as topic exchanges:
> ```typescript
> @RabbitSubscribe({ queue: "article", routingKey: "article.#" })
> // matches: article.published, article.deleted, article.updated.title, …
> ```

> **Unmatched messages** – if a message arrives on the queue but no handler's `routingKey` matches it (and no handler has `routingKey` omitted), the lib automatically acks it to prevent it from blocking the queue.

> **Mix freely** – you can combine filtered and unfiltered handlers on the same queue. Unfiltered handlers (`routingKey` omitted) always run.

> **Durability** – unlike exchange + routing key mode, the queue persists even when no consumers are connected, so messages are never lost. This mode is recommended for production workloads.

> **Settle guard** – `ack()`, `nack()`, and `reject()` are wrapped so only the **first** call takes effect. Subsequent calls from other handlers are silently ignored, preventing "already acknowledged" errors.

> **`noAck` mode** – the channel uses `noAck: true` only when _every_ handler for a queue opts in. If at least one handler uses manual ack (the default), the channel is placed in manual-ack mode.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderConsumer {

  // Manual acknowledgement (default)
  @RabbitSubscribe({ queue: "orders.created" })
  async handleOrderCreated(msg: RabbitMessage<{ orderId: string }>) {
    console.log("New order:", msg.data.orderId);
    msg.ack();         // acknowledge – removes message from queue
    // msg.nack();     // negative-ack + requeue (default requeue: true)
    // msg.reject();   // reject without requeue
  }

  // Automatic acknowledgement
  @RabbitSubscribe({ queue: "notifications", noAck: true })
  async handleNotification(msg: RabbitMessage<{ text: string }>) {
    console.log(msg.data.text);
    // no need to call msg.ack()
  }
}
```

Add the consumer class to the `providers` array of its module:

```typescript
@Module({
  imports: [RabbitMQModule.register({ ... })],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### `RabbitMessage<T>`

| Property | Type | Description |
|---|---|---|
| `data` | `T` | Deserialized JSON payload |
| `raw` | `ConsumeMessage` | Raw amqplib message |
| `ack()` | `() => void` | Acknowledge the message |
| `nack(requeue?)` | `(boolean?) => void` | Negative-ack (requeue default: `true`) |
| `reject()` | `() => void` | Reject without requeueing |

---

## Publishing Messages

Inject `RabbitMQService` anywhere in your application to publish messages.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(order: Order) {
    // Publish to an exchange with a routing key
    await this.rabbit.publish("orders", "orders.created.v1", order);
  }

  async sendDirectToQueue(notification: Notification) {
    // Send directly to a queue, bypassing exchange routing
    await this.rabbit.sendToQueue("notifications", notification);
  }
}
```

### Publish options

Both `publish()` and `sendToQueue()` accept an optional `RabbitPublishOptions` object:

```typescript
await this.rabbit.publish("orders", "orders.created", payload, {
  persistent: true,           // survive broker restart (default: true)
  headers: { "x-version": 2 },
  correlationId: "req-123",
  expiration: 30_000,         // message TTL in ms
  priority: 5,                // 0–9
});
```

---

## Multiple Queues

Because each `@RabbitSubscribe` gets its own dedicated channel, a single consumer class can listen to multiple independent queues simultaneously:

```typescript
@RabbitConsumer()
export class EventConsumer {

  @RabbitSubscribe({ queue: "user.registered" })
  async onUserRegistered(msg: RabbitMessage<User>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "payment.completed" })
  async onPaymentCompleted(msg: RabbitMessage<Payment>) { /* … */ msg.ack(); }

  @RabbitSubscribe({ queue: "shipment.dispatched" })
  async onShipmentDispatched(msg: RabbitMessage<Shipment>) { /* … */ msg.ack(); }
}
```

---

## Routing Key Subscriptions (Topic / Direct Fan-out)

Besides consuming a named queue, `@RabbitSubscribe` also supports **routing key mode**:
declare `exchange` + `routingKey` instead of `queue`.

When this mode is used, the lib:

1. Creates a server-named **exclusive, auto-delete** queue per handler at startup.
2. Binds that queue to the given exchange with the given routing key.
3. Starts consuming from that private queue.

Because every handler gets its **own** queue, all handlers subscribed to the same routing
key receive an independent copy of each message — this is the natural fan-out behaviour of
topic exchanges.

> **No queue declarations needed.** The lib manages the ephemeral queues automatically.
> You only need to declare the exchange in `RabbitMQModule.register({ exchanges: [...] })`.

### Basic example

```typescript
// 1. Declare only the exchange in the module
RabbitMQModule.register({
  uri: "amqp://...",
  exchanges: [{ name: "articles", type: "topic" }],
})

// 2. Subscribe to specific routing keys
@RabbitConsumer()
export class ArticleConsumer {

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Published:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.updated" })
  async onUpdated(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Updated:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Deleted:", msg.data.articleId);
    msg.ack();
  }
}
```

```typescript
// 3. Publish with the routing key
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Multiple handlers for the same routing key

Every handler subscribed to the same routing key is called independently.  
You can spread handlers across different classes:

```typescript
/** Handler A – invalidate cache */
@RabbitConsumer()
export class ArticleCacheHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await invalidateCache(msg.data.articleId);
    msg.ack();
  }
}

/** Handler B – send push notification */
@RabbitConsumer()
export class ArticleNotificationHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await sendPushNotification(msg.data.articleId);
    msg.ack();
  }
}

// Publishing one message → both handlers are triggered simultaneously
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Wildcard patterns

Topic exchanges support `*` (one word) and `#` (zero or more words):

```typescript
@RabbitConsumer()
export class ArticleAuditHandler {

  // Matches: article.published, article.updated, article.deleted, …
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.#" })
  async onAnyArticleEvent(msg: RabbitMessage<{ articleId: string }>) {
    console.log(
      "Event:", msg.raw.fields.routingKey,
      "| Article:", msg.data.articleId,
    );
    msg.ack();
  }
}
```

### `@RabbitSubscribe` options reference

| Option | Type | Required | Description |
|---|---|---|---|
| `queue` | `string` | ✅ *(modes 1 & 2)* | Named queue to consume from. |
| `exchange` | `string` | ✅ *(mode 3)* | Exchange to bind to. Must be used together with `routingKey` and **without** `queue`. |
| `routingKey` | `string` | — | Routing key pattern. Supports `*` and `#` wildcards.<br>• With `queue` (mode 2): filters which messages dispatch to this handler.<br>• With `exchange` (mode 3): binds an ephemeral queue to the exchange. |
| `noAck` | `boolean` | — | Auto-acknowledge on delivery. Default: `false`. |

**Mode summary**

| `queue` | `exchange` | `routingKey` | Behaviour |
|:---:|:---:|:---:|---|
| ✅ | — | — | Receives every message from the named queue |
| ✅ | — | ✅ | Receives only messages whose routing key matches the pattern |
| — | ✅ | ✅ | Creates an ephemeral exclusive queue bound to the exchange |

---

## Dead Letter Exchanges & DLQ Reprocessing

When a message is **rejected**, **expired** (TTL), or the queue reaches `maxLength`, RabbitMQ
routes it to a configured **Dead Letter Exchange (DLX)**, from where it lands in a
**Dead Letter Queue (DLQ)**. The lib gives you two tools to work with DLQs:

1. **Auto-topology** – declare the DLX exchange + DLQ queue with a single config option
2. **`RabbitMQDeadLetterService`** – inspect, requeue, or discard dead-lettered messages

### 1. Auto-topology with `deadLetterQueue`

Set `deadLetterExchange` **and** `deadLetterQueue` together. The lib will automatically
assert the DLX exchange, the DLQ queue, and their binding on startup — no need to list
them in the `exchanges` or `queues` arrays separately.

```typescript
RabbitMQModule.register({
  exchanges: [
    { name: "events", type: "topic" },
    // ↑ you only need to declare your main exchange
    // The DLX "orders.cancelled.dlx" is auto-asserted below
  ],
  queues: [
    {
      name: "orders.cancelled",
      bindings: { exchange: "events", routingKey: "orders.cancelled" },

      // ─── Dead Letter config ─────────────────────────────────────────────
      deadLetterExchange:    "orders.cancelled.dlx",  // DLX name (auto-asserted)
      deadLetterRoutingKey:  "orders.cancelled.dead", // routing key to DLQ
      deadLetterQueue:       "orders.cancelled.dlq",  // DLQ name (auto-asserted + bound)
      deadLetterExchangeType: "direct",               // optional, default: "direct"

      messageTtl: 30_000, // messages expire → go to DLQ after 30 s
    },
  ],
})
```

> **What happens at startup**
>
> | Step | Action |
> |------|--------|
> | 1 | Assert `orders.cancelled` queue with `x-dead-letter-exchange` arg |
> | 2 | Assert exchange `orders.cancelled.dlx` (direct, durable) |
> | 3 | Assert queue `orders.cancelled.dlq` (durable) |
> | 4 | Bind `orders.cancelled.dlq` → `orders.cancelled.dlx` with key `orders.cancelled.dead` |

---

### 2. Consuming DLQ messages with `@RabbitSubscribe`

Since the DLQ is a normal queue, you can attach a `@RabbitConsumer` to it.
Messages arrive as `DeadLetterMessage<T>` (import the type from the lib) which
adds a `deathInfo` field and a `republish()` helper.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { DeadLetterMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderDLQConsumer {

  @RabbitSubscribe({ queue: "orders.cancelled.dlq" })
  async handle(msg: DeadLetterMessage<{ orderId: string }>) {
    const { orderId } = msg.data;
    const info = msg.deathInfo; // structured x-death metadata

    console.warn(`Dead letter: ${orderId} | reason=${info?.reason} | attempts=${info?.count}`);

    if ((info?.count ?? 0) < 3) {
      // Retry: republish to the original exchange
      await msg.republish("events", "orders.cancelled");
      msg.ack(); // remove from DLQ after successful republish
    } else {
      // Too many failures → discard
      console.error(`Giving up on order ${orderId}`);
      msg.ack();
    }
  }
}
```

#### `DeadLetterMessage<T>`

| Property | Type | Description |
|---|---|---|
| `data` | `T` | Deserialized JSON payload |
| `raw` | `ConsumeMessage` | Raw amqplib message |
| `deathInfo` | `DeadLetterDeathInfo \| null` | Structured `x-death` metadata |
| `ack()` | `() => void` | Remove permanently from DLQ |
| `nack(requeue?)` | `(boolean?) => void` | Return to DLQ (requeue default: `false`) |
| `republish(exchange, key, opts?)` | `Promise<void>` | Re-publish to an exchange for reprocessing |

#### `DeadLetterDeathInfo`

| Property | Type | Description |
|---|---|---|
| `queue` | `string` | Original queue where the message died |
| `exchange` | `string` | Exchange where it was published |
| `routingKeys` | `string[]` | Routing keys used |
| `count` | `number` | How many times this message has died |
| `reason` | `"rejected" \| "expired" \| "maxlen" \| "delivery-limit"` | Why it was dead-lettered |
| `time` | `Date` | When it was dead-lettered |

---

### 3. Manual reprocessing with `RabbitMQDeadLetterService`

`RabbitMQDeadLetterService` is registered **globally** by `RabbitMQModule` and can be
injected anywhere in your application. Useful for admin REST endpoints, scheduled
requeue jobs, or CLI scripts.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQDeadLetterService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DLQAdminService {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  // How many messages are stuck
  async countFailed() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  // Peek at messages without consuming them
  async preview(limit = 10) {
    return this.dlq.inspect("orders.cancelled.dlq", limit);
  }

  // Move all messages back to the original exchange
  async retryAll() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
    });
  }

  // Move only the first 50
  async retryBatch() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: 50,
    });
  }

  // Permanently delete all dead letters
  async purge() {
    return this.dlq.discardMessages("orders.cancelled.dlq");
  }
}
```

#### `RabbitMQDeadLetterService` API

| Method | Returns | Description |
|---|---|---|
| `inspect<T>(queue, count?)` | `Promise<DeadLetterMessage<T>[]>` | Peek at messages (put back after reading) |
| `requeueMessages(options)` | `Promise<number>` | Move messages → exchange. Returns count requeued. |
| `discardMessages(queue, count?)` | `Promise<number>` | Permanently delete messages. Returns count discarded. |
| `messageCount(queue)` | `Promise<number>` | Current message count in a queue |

#### `RequeueOptions`

| Field | Type | Required | Description |
|---|---|---|---|
| `fromQueue` | `string` | ✅ | Dead letter queue to consume from |
| `toExchange` | `string` | ✅ | Exchange to republish to |
| `routingKey` | `string` | ✅ | Routing key for republished messages |
| `count` | `number` | — | Max messages to requeue. Omit for **all**. |
| `publishOptions` | `RabbitPublishOptions` | — | Additional publish options |

> Every republished message gets an `x-dlq-requeued` header incremented on each manual requeue,
> so you can track how many times a message has been manually retried if needed.

---

### 4. Admin HTTP endpoints example

A common pattern is exposing DLQ management via protected REST endpoints:

```typescript
@Controller("/admin/dlq")
export class DLQController {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  @Get("/count")
  count() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  @Get("/inspect")
  inspect(@Query("limit") limit: string) {
    return this.dlq.inspect("orders.cancelled.dlq", Number(limit ?? 10));
  }

  @Get("/requeue")
  requeue(@Query("limit") limit: string) {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: limit ? Number(limit) : undefined,
    });
  }

  @Get("/discard")
  discard(@Query("limit") limit: string) {
    return this.dlq.discardMessages(
      "orders.cancelled.dlq",
      limit ? Number(limit) : undefined,
    );
  }
}
```

---

## Practical Example

<<< @/../examples/13-rabbitmq/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/13-rabbitmq/index.ts)

