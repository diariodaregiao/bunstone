# Módulo BullMQ

O módulo BullMQ de `@grupodiariodaregiao/bunstone` fornece uma forma de processar tarefas em segundo plano usando [BullMQ](https://docs.bullmq.io/).

## Instalação

Primeiro, garanta que você tenha as dependências necessárias:

```bash
bun add bullmq ioredis
```

## Configuração

Para usar BullMQ, você precisa registrar o `BullMqModule` no seu `AppModule`.

```typescript
import { BullMqModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    BullMqModule.register({
      host: 'localhost',
      port: 6379,
    }),
  ],
})
export class AppModule {}
```

## Criando um processor

Um processor é uma classe decorada com `@Processor()`. Ela contém métodos decorados com `@Process()` que lidam com jobs de uma fila específica.

```typescript
import { Process, Processor } from "@grupodiariodaregiao/bunstone";
import { Job } from "bullmq";

@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome')
  async handleSendWelcome(job: Job) {
    console.log('Enviando e-mail de boas-vindas para:', job.data.email);
    // Simula trabalho
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { sent: true };
  }

  @Process()
  async handleDefault(job: Job) {
    console.log('Processando tipo de job desconhecido:', job.name);
  }
}
```

Não se esqueça de adicionar seu processor aos `providers` de um módulo.

## Produzindo jobs

Você pode injetar o `QueueService` nos seus controllers ou services para adicionar jobs a uma fila.

```typescript
import {
  Controller,
  Get,
  Query,
  QueueService,
} from "@grupodiariodaregiao/bunstone";

@Controller('/email')
export class EmailController {
  constructor(private readonly queueService: QueueService) {}

  @Get('/send')
  async sendEmail(@Query('email') email: string) {
    await this.queueService.add('email-queue', 'send-welcome', { email });
    return { status: 'Job adicionado à fila' };
  }
}
```

## Exemplo completo

Explore um fluxo completo com producer + processor:

<<< @/../examples/12-bullmq/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/12-bullmq/index.ts)

## Opções do processor

O decorator `@Processor` aceita um objeto de opções:

```typescript
@Processor({
  queueName: 'heavy-tasks',
  concurrency: 5,
})
export class HeavyTaskProcessor {
  // ...
}
```
