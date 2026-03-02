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

## Dead Letter Exchanges

Route failed/expired messages to a DLX for inspection or retry:

```typescript
RabbitMQModule.register({
  exchanges: [
    { name: "orders", type: "topic" },
    { name: "orders.dlx", type: "fanout" },
  ],
  queues: [
    {
      name: "orders.created",
      bindings: { exchange: "orders", routingKey: "orders.created" },
      deadLetterExchange: "orders.dlx",
      messageTtl: 30_000,
    },
    {
      // Queue that receives dead-lettered messages
      name: "orders.dead",
      bindings: { exchange: "orders.dlx", routingKey: "" },
    },
  ],
})
```

---

## Practical Example

<<< @/../examples/13-rabbitmq/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/13-rabbitmq/index.ts)
