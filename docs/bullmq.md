# BullMQ Module

The `@grupodiariodaregiao/bunstone` BullMQ module provides a way to process background jobs using [BullMQ](https://docs.bullmq.io/).

## Installation

First, ensure you have the required dependencies:

```bash
bun add bullmq ioredis
```

## Setup

To use BullMQ, you need to register the `BullMqModule` in your `AppModule`.

```typescript
import { Module } from "@grupodiariodaregiao/bunstone";
import { BullMqModule } from "@grupodiariodaregiao/bunstone/lib/bullmq/bullmq-module";

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

## Creating a Processor

A processor is a class decorated with `@Processor()`. It contains methods decorated with `@Process()` that handle jobs from a specific queue.

```typescript
import { Processor, Process } from "@grupodiariodaregiao/bunstone/lib/bullmq/decorators";
import { Job } from "bullmq";

@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome')
  async handleSendWelcome(job: Job) {
    console.log('Sending welcome email to:', job.data.email);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { sent: true };
  }

  @Process()
  async handleDefault(job: Job) {
    console.log('Handling unknown job type:', job.name);
  }
}
```

Don't forget to add your processor to the `providers` of a module.

## Producing Jobs

You can inject the `QueueService` into your controllers or services to add jobs to a queue.

```typescript
import { Controller, Get, Query } from "@grupodiariodaregiao/bunstone/lib/controller";
import { QueueService } from "@grupodiariodaregiao/bunstone/lib/bullmq/queue.service";

@Controller('/email')
export class EmailController {
  constructor(private readonly queueService: QueueService) {}

  @Get('/send')
  async sendEmail(@Query('email') email: string) {
    await this.queueService.add('email-queue', 'send-welcome', { email });
    return { status: 'Job added to queue' };
  }
}
```

## Processor Options

The `@Processor` decorator accepts an options object:

```typescript
@Processor({
  queueName: 'heavy-tasks',
  concurrency: 5,
})
export class HeavyTaskProcessor {
  // ...
}
```
