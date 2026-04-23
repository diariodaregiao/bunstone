# Módulo RabbitMQ

O módulo RabbitMQ do `@grupodiariodaregiao/bunstone` oferece suporte de primeira classe para publicar e consumir mensagens via [RabbitMQ](https://www.rabbitmq.com/) (AMQP 0-9-1).

## Instalação

```bash
bun add amqplib
bun add -d @types/amqplib
```

## Configuração

Registre `RabbitMQModule` uma vez no seu `AppModule` raiz. O módulo é **global**, então `RabbitMQService` pode ser injetado em qualquer lugar sem reimportar o módulo.

```typescript
import { Module, RabbitMQModule } from "@grupodiariodaregiao/bunstone";

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

### Opções de conexão

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `uri` | `string` | – | URI AMQP completa. Tem precedência sobre os campos individuais. |
| `host` | `string` | `"localhost"` | Hostname do broker |
| `port` | `number` | `5672` | Porta do broker |
| `username` | `string` | `"guest"` | Nome de usuário AMQP |
| `password` | `string` | `"guest"` | Senha AMQP |
| `vhost` | `string` | `"/"` | Host virtual |
| `exchanges` | `RabbitMQExchangeConfig[]` | `[]` | Exchanges a serem garantidas na inicialização |
| `queues` | `RabbitMQQueueConfig[]` | `[]` | Filas a serem garantidas e vinculadas na inicialização |
| `prefetch` | `number` | `10` | Limite de mensagens não confirmadas por canal consumidor |
| `reconnect.enabled` | `boolean` | `true` | Reconectar em caso de perda de conexão |
| `reconnect.delay` | `number` | `2000` | ms entre tentativas de reconexão |
| `reconnect.maxRetries` | `number` | `10` | Máximo de tentativas (0 = ilimitado) |

---

## Declarando Exchanges

```typescript
exchanges: [
  {
    name: "orders",
    type: "topic",      // "direct" | "topic" | "fanout" | "headers"
    durable: true,      // sobrevive à reinicialização do broker (padrão: true)
    autoDelete: false,  // remove quando não restarem bindings (padrão: false)
  },
]
```

## Declarando Filas

```typescript
queues: [
  {
    name: "orders.created",
    durable: true,

    // Vincula a uma exchange
    bindings: { exchange: "orders", routingKey: "orders.created.*" },

    // Ou vincula a múltiplas exchanges
    // bindings: [
    //   { exchange: "orders",  routingKey: "orders.created.*" },
    //   { exchange: "audit",   routingKey: "#" },
    // ],

    // Dead letter exchange para mensagens rejeitadas/expiradas
    deadLetterExchange: "orders.dlx",
    deadLetterRoutingKey: "orders.dead",

    messageTtl: 60_000,  // expiração da mensagem em ms
    maxLength: 10_000,   // limita a profundidade da fila
  },
]
```

---

## Consumindo Mensagens

Um **consumer** é uma classe decorada com `@RabbitConsumer()` que contém métodos decorados com `@RabbitSubscribe()`.

Existem três modos de assinatura:

| Modo | Quando usar |
|---|---|
| **Modo fila** – `{ queue: "..." }` | Consome de uma fila persistente pré-declarada. O handler recebe **todas** as mensagens que chegam nessa fila, independentemente da routing key. |
| **Fila + filtro por routing key** – `{ queue: "...", routingKey: "..." }` | Consome de uma fila pré-declarada, mas **despacha apenas** mensagens cuja routing key corresponda ao padrão declarado. Mensagens que não correspondem são confirmadas silenciosamente. |
| **Modo exchange / routing key** – `{ exchange: "...", routingKey: "..." }` | A lib cria uma fila exclusiva com auto-delete por handler e a vincula à exchange. Cada handler para a mesma routing key recebe sua própria cópia (fan-out no nível do broker). |

### Modo fila – fan-out em processo

Quando **múltiplos handlers** (na mesma classe `@RabbitConsumer` ou em classes diferentes) assinam o **mesmo nome de fila**, a lib cria um único consumer AMQP e entrega cada mensagem para **todos os handlers** em sequência.

```typescript
@RabbitConsumer()
export class Consumer1 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEBIDO 1", msg.data);
    msg.ack(); // apenas a primeira chamada de ack/nack/reject tem efeito
  }
}

@RabbitConsumer()
export class Consumer2 {
  @RabbitSubscribe({ queue: "orders" })
  async data(msg: RabbitMessage<{ item: string }>) {
    console.log("RECEBIDO 2", msg.data);
    msg.ack(); // sem efeito: a mensagem já foi concluída acima
  }
}
```

### Modo fila com filtro por routing key

Adicione `routingKey` a uma assinatura em modo fila para torná-la **seletiva**: o handler só é chamado quando a routing key da mensagem recebida corresponde ao padrão declarado. Mensagens que não correspondem a nenhum handler são **confirmadas silenciosamente** para que não se acumulem como não confirmadas.

Isso é útil quando uma única fila durável recebe múltiplos tipos de evento (por exemplo, `article.*`), mas handlers diferentes devem reagir apenas a eventos específicos.

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

  // ✅ Só é chamado quando routingKey === "article.published"
  @RabbitSubscribe({ queue: "article", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("publicado", msg.data.articleId);
    msg.ack();
  }

  // ✅ Só é chamado quando routingKey === "article.deleted"
  @RabbitSubscribe({ queue: "article", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("excluído", msg.data.articleId);
    msg.ack();
  }

  // ✅ Sem routingKey → é chamado para TODA mensagem na fila
  @RabbitSubscribe({ queue: "article" })
  async onAll(msg: RabbitMessage<{ articleId: string }>) {
    console.log("qualquer evento", msg.raw.fields.routingKey, msg.data.articleId);
    msg.ack();
  }
}
```

> **Padrões com curingas** – `routingKey` suporta os mesmos curingas `*` (uma palavra) e `#` (zero ou mais palavras) das topic exchanges:
> ```typescript
> @RabbitSubscribe({ queue: "article", routingKey: "article.#" })
> // corresponde a: article.published, article.deleted, article.updated.title, …
> ```

> **Mensagens sem correspondência** – se uma mensagem chegar à fila mas nenhuma `routingKey` de handler corresponder a ela (e nenhum handler tiver `routingKey` omitida), a lib faz `ack` automaticamente para evitar que ela bloqueie a fila.

> **Misture livremente** – você pode combinar handlers filtrados e não filtrados na mesma fila. Handlers não filtrados (`routingKey` omitida) sempre executam.

> **Durabilidade** – ao contrário do modo exchange + routing key, a fila persiste mesmo quando não há consumers conectados, então as mensagens nunca são perdidas. Este modo é recomendado para cargas de trabalho de produção.

> **Proteção de conclusão** – `ack()`, `nack()` e `reject()` são encapsulados para que apenas a **primeira** chamada tenha efeito. Chamadas posteriores de outros handlers são ignoradas silenciosamente, evitando erros de "already acknowledged".

> **Modo `noAck`** – o canal usa `noAck: true` apenas quando _todo_ handler de uma fila opta por isso. Se pelo menos um handler usar ack manual (padrão), o canal entra em modo de ack manual.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { RabbitMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderConsumer {

  // Confirmação manual (padrão)
  @RabbitSubscribe({ queue: "orders.created" })
  async handleOrderCreated(msg: RabbitMessage<{ orderId: string }>) {
    console.log("Novo pedido:", msg.data.orderId);
    msg.ack();         // confirma – remove a mensagem da fila
    // msg.nack();     // negativa + reencaminha (requeue padrão: true)
    // msg.reject();   // rejeita sem reencaminhar
  }

  // Confirmação automática
  @RabbitSubscribe({ queue: "notifications", noAck: true })
  async handleNotification(msg: RabbitMessage<{ text: string }>) {
    console.log(msg.data.text);
    // não é necessário chamar msg.ack()
  }
}
```

Adicione a classe consumer ao array `providers` do módulo:

```typescript
@Module({
  imports: [RabbitMQModule.register({ ... })],
  providers: [OrderConsumer],
})
export class AppModule {}
```

### `RabbitMessage<T>`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `data` | `T` | Payload JSON desserializado |
| `raw` | `ConsumeMessage` | Mensagem bruta do amqplib |
| `ack()` | `() => void` | Confirma a mensagem |
| `nack(requeue?)` | `(boolean?) => void` | Confirmação negativa (requeue padrão: `true`) |
| `reject()` | `() => void` | Rejeita sem reenfileirar |

---

## Publicando Mensagens

Injete `RabbitMQService` em qualquer lugar da aplicação para publicar mensagens.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class OrderService {
  constructor(private readonly rabbit: RabbitMQService) {}

  async placeOrder(order: Order) {
    // Publica em uma exchange com uma routing key
    await this.rabbit.publish("orders", "orders.created.v1", order);
  }

  async sendDirectToQueue(notification: Notification) {
    // Envia diretamente para uma fila, ignorando o roteamento por exchange
    await this.rabbit.sendToQueue("notifications", notification);
  }
}
```

### Opções de publicação

Tanto `publish()` quanto `sendToQueue()` aceitam um objeto `RabbitPublishOptions` opcional:

```typescript
await this.rabbit.publish("orders", "orders.created", payload, {
  persistent: true,           // sobrevive à reinicialização do broker (padrão: true)
  headers: { "x-version": 2 },
  correlationId: "req-123",
  expiration: 30_000,         // TTL da mensagem em ms
  priority: 5,                // 0–9
});
```

---

## Múltiplas Filas

Como cada `@RabbitSubscribe` recebe seu próprio canal dedicado, uma única classe consumer pode escutar múltiplas filas independentes simultaneamente:

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

## Assinaturas por Routing Key (Fan-out em Topic / Direct)

Além de consumir uma fila nomeada, `@RabbitSubscribe` também suporta o **modo routing key**:
declare `exchange` + `routingKey` em vez de `queue`.

Quando este modo é usado, a lib:

1. Cria uma fila **exclusiva, com auto-delete e nome gerado pelo servidor** por handler na inicialização.
2. Vincula essa fila à exchange informada com a routing key informada.
3. Começa a consumir dessa fila privada.

Como cada handler recebe sua **própria** fila, todos os handlers inscritos na mesma routing
key recebem uma cópia independente de cada mensagem — este é o comportamento natural de fan-out
das topic exchanges.

> **Não é necessário declarar filas.** A lib gerencia automaticamente as filas efêmeras.
> Você só precisa declarar a exchange em `RabbitMQModule.register({ exchanges: [...] })`.

### Exemplo básico

```typescript
// 1. Declare apenas a exchange no módulo
RabbitMQModule.register({
  uri: "amqp://...",
  exchanges: [{ name: "articles", type: "topic" }],
})

// 2. Assine routing keys específicas
@RabbitConsumer()
export class ArticleConsumer {

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Publicado:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.updated" })
  async onUpdated(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Atualizado:", msg.data.articleId);
    msg.ack();
  }

  @RabbitSubscribe({ exchange: "articles", routingKey: "article.deleted" })
  async onDeleted(msg: RabbitMessage<{ articleId: string }>) {
    console.log("Excluído:", msg.data.articleId);
    msg.ack();
  }
}
```

```typescript
// 3. Publique com a routing key
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Múltiplos handlers para a mesma routing key

Cada handler inscrito na mesma routing key é chamado de forma independente.  
Você pode distribuir handlers em classes diferentes:

```typescript
/** Handler A – invalida cache */
@RabbitConsumer()
export class ArticleCacheHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await invalidateCache(msg.data.articleId);
    msg.ack();
  }
}

/** Handler B – envia notificação push */
@RabbitConsumer()
export class ArticleNotificationHandler {
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.published" })
  async onPublished(msg: RabbitMessage<{ articleId: string }>) {
    await sendPushNotification(msg.data.articleId);
    msg.ack();
  }
}

// Publicando uma mensagem → ambos os handlers são acionados simultaneamente
await this.rabbit.publish("articles", "article.published", { articleId: "123" });
```

### Padrões com curingas

Topic exchanges suportam `*` (uma palavra) e `#` (zero ou mais palavras):

```typescript
@RabbitConsumer()
export class ArticleAuditHandler {

  // Corresponde a: article.published, article.updated, article.deleted, …
  @RabbitSubscribe({ exchange: "articles", routingKey: "article.#" })
  async onAnyArticleEvent(msg: RabbitMessage<{ articleId: string }>) {
    console.log(
      "Evento:", msg.raw.fields.routingKey,
      "| Artigo:", msg.data.articleId,
    );
    msg.ack();
  }
}
```

### Referência de opções do `@RabbitSubscribe`

| Opção | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `queue` | `string` | ✅ *(modos 1 e 2)* | Fila nomeada da qual consumir. |
| `exchange` | `string` | ✅ *(modo 3)* | Exchange à qual vincular. Deve ser usada junto com `routingKey` e **sem** `queue`. |
| `routingKey` | `string` | — | Padrão de routing key. Suporta curingas `*` e `#`.<br>• Com `queue` (modo 2): filtra quais mensagens serão despachadas para este handler.<br>• Com `exchange` (modo 3): vincula uma fila efêmera à exchange. |
| `noAck` | `boolean` | — | Confirma automaticamente no recebimento. Padrão: `false`. |

**Resumo dos modos**

| `queue` | `exchange` | `routingKey` | Comportamento |
|:---:|:---:|:---:|---|
| ✅ | — | — | Recebe toda mensagem da fila nomeada |
| ✅ | — | ✅ | Recebe apenas mensagens cuja routing key corresponda ao padrão |
| — | ✅ | ✅ | Cria uma fila exclusiva efêmera vinculada à exchange |

---

## Dead Letter Exchanges e Reprocessamento de DLQ

Quando uma mensagem é **rejeitada**, **expira** (TTL), ou a fila atinge `maxLength`, o RabbitMQ
a encaminha para uma **Dead Letter Exchange (DLX)** configurada, de onde ela cai em uma
**Dead Letter Queue (DLQ)**. A lib oferece duas ferramentas para trabalhar com DLQs:

1. **Topologia automática** – declare a exchange DLX + fila DLQ com uma única opção de configuração
2. **`RabbitMQDeadLetterService`** – inspecione, reenfileire ou descarte mensagens mortas

### 1. Topologia automática com `deadLetterQueue`

Defina `deadLetterExchange` **e** `deadLetterQueue` juntos. A lib irá automaticamente
garantir a exchange DLX, a fila DLQ e o binding entre elas na inicialização — sem precisar
listá-las separadamente nos arrays `exchanges` ou `queues`.

```typescript
RabbitMQModule.register({
  exchanges: [
    { name: "events", type: "topic" },
    // ↑ você só precisa declarar sua exchange principal
    // A DLX "orders.cancelled.dlx" é garantida automaticamente abaixo
  ],
  queues: [
    {
      name: "orders.cancelled",
      bindings: { exchange: "events", routingKey: "orders.cancelled" },

      // ─── Configuração de Dead Letter ─────────────────────────────────────
      deadLetterExchange:    "orders.cancelled.dlx",  // nome da DLX (garantida automaticamente)
      deadLetterRoutingKey:  "orders.cancelled.dead", // routing key para a DLQ
      deadLetterQueue:       "orders.cancelled.dlq",  // nome da DLQ (garantida e vinculada automaticamente)
      deadLetterExchangeType: "direct",               // opcional, padrão: "direct"

      messageTtl: 30_000, // mensagens expiram → vão para a DLQ após 30 s
    },
  ],
})
```

> **O que acontece na inicialização**
>
> | Etapa | Ação |
> |------|--------|
> | 1 | Garante a fila `orders.cancelled` com o argumento `x-dead-letter-exchange` |
> | 2 | Garante a exchange `orders.cancelled.dlx` (direct, durável) |
> | 3 | Garante a fila `orders.cancelled.dlq` (durável) |
> | 4 | Vincula `orders.cancelled.dlq` → `orders.cancelled.dlx` com a chave `orders.cancelled.dead` |

---

### 2. Consumindo mensagens da DLQ com `@RabbitSubscribe`

Como a DLQ é uma fila normal, você pode conectar um `@RabbitConsumer` a ela.
As mensagens chegam como `DeadLetterMessage<T>` (importe o tipo da lib), que
adiciona um campo `deathInfo` e um helper `republish()`.

```typescript
import { RabbitConsumer, RabbitSubscribe } from "@grupodiariodaregiao/bunstone";
import type { DeadLetterMessage } from "@grupodiariodaregiao/bunstone";

@RabbitConsumer()
export class OrderDLQConsumer {

  @RabbitSubscribe({ queue: "orders.cancelled.dlq" })
  async handle(msg: DeadLetterMessage<{ orderId: string }>) {
    const { orderId } = msg.data;
    const info = msg.deathInfo; // metadados estruturados de x-death

    console.warn(`Mensagem morta: ${orderId} | motivo=${info?.reason} | tentativas=${info?.count}`);

    if ((info?.count ?? 0) < 3) {
      // Tenta novamente: republica para a exchange original
      await msg.republish("events", "orders.cancelled");
      msg.ack(); // remove da DLQ após republicar com sucesso
    } else {
      // Falhou muitas vezes → descarta
      console.error(`Desistindo do pedido ${orderId}`);
      msg.ack();
    }
  }
}
```

#### `DeadLetterMessage<T>`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `data` | `T` | Payload JSON desserializado |
| `raw` | `ConsumeMessage` | Mensagem bruta do amqplib |
| `deathInfo` | `DeadLetterDeathInfo \| null` | Metadados estruturados de `x-death` |
| `ack()` | `() => void` | Remove permanentemente da DLQ |
| `nack(requeue?)` | `(boolean?) => void` | Retorna para a DLQ (requeue padrão: `false`) |
| `republish(exchange, key, opts?)` | `Promise<void>` | Republica em uma exchange para reprocessamento |

#### `DeadLetterDeathInfo`

| Propriedade | Tipo | Descrição |
|---|---|---|
| `queue` | `string` | Fila original onde a mensagem morreu |
| `exchange` | `string` | Exchange onde ela foi publicada |
| `routingKeys` | `string[]` | Routing keys usadas |
| `count` | `number` | Quantas vezes esta mensagem morreu |
| `reason` | `"rejected" \| "expired" \| "maxlen" \| "delivery-limit"` | Motivo pelo qual ela foi para dead letter |
| `time` | `Date` | Quando ela foi para dead letter |

---

### 3. Reprocessamento manual com `RabbitMQDeadLetterService`

`RabbitMQDeadLetterService` é registrado **globalmente** por `RabbitMQModule` e pode ser
injetado em qualquer lugar da aplicação. Útil para endpoints REST administrativos, jobs
agendados de reenvio ou scripts de CLI.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";
import { RabbitMQDeadLetterService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DLQAdminService {
  constructor(private readonly dlq: RabbitMQDeadLetterService) {}

  // Quantas mensagens estão presas
  async countFailed() {
    return this.dlq.messageCount("orders.cancelled.dlq");
  }

  // Visualiza mensagens sem consumi-las
  async preview(limit = 10) {
    return this.dlq.inspect("orders.cancelled.dlq", limit);
  }

  // Move todas as mensagens de volta para a exchange original
  async retryAll() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
    });
  }

  // Move apenas as primeiras 50
  async retryBatch() {
    return this.dlq.requeueMessages({
      fromQueue:  "orders.cancelled.dlq",
      toExchange: "events",
      routingKey: "orders.cancelled",
      count: 50,
    });
  }

  // Exclui permanentemente todas as mensagens mortas
  async purge() {
    return this.dlq.discardMessages("orders.cancelled.dlq");
  }
}
```

#### API de `RabbitMQDeadLetterService`

| Método | Retorna | Descrição |
|---|---|---|
| `inspect<T>(queue, count?)` | `Promise<DeadLetterMessage<T>[]>` | Visualiza mensagens (coloca de volta após ler) |
| `requeueMessages(options)` | `Promise<number>` | Move mensagens → exchange. Retorna a quantidade reenfileirada. |
| `discardMessages(queue, count?)` | `Promise<number>` | Exclui permanentemente mensagens. Retorna a quantidade descartada. |
| `messageCount(queue)` | `Promise<number>` | Quantidade atual de mensagens em uma fila |

#### `RequeueOptions`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `fromQueue` | `string` | ✅ | Dead letter queue da qual consumir |
| `toExchange` | `string` | ✅ | Exchange para a qual republicar |
| `routingKey` | `string` | ✅ | Routing key das mensagens republicadas |
| `count` | `number` | — | Máximo de mensagens para reenfileirar. Omita para **todas**. |
| `publishOptions` | `RabbitPublishOptions` | — | Opções adicionais de publicação |

> Toda mensagem republicada recebe um header `x-dlq-requeued` incrementado a cada reenfileiramento manual,
> para que você possa acompanhar quantas vezes uma mensagem foi tentada manualmente, se necessário.

---

### 4. Exemplo de endpoints HTTP administrativos

Um padrão comum é expor o gerenciamento de DLQ via endpoints REST protegidos:

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

## Exemplo Prático

<<< @/../examples/13-rabbitmq/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/13-rabbitmq/index.ts)
