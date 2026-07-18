import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { RabbitConsumer, RabbitSubscribe } from "@/messaging/decorators";
import { RabbitMQService } from "@/messaging/rabbitmq.service";
import { RabbitMQModule } from "@/messaging/rabbitmq-module";
import type { RabbitMessage } from "@/messaging/types";

const URI = process.env.RABBITMQ_URI ?? "amqp://guest:guest@localhost:5672";

async function brokerReachable(): Promise<boolean> {
	try {
		const amqp = await import("amqplib");
		const conn = await amqp.connect(URI);
		await conn.close();
		return true;
	} catch {
		return false;
	}
}

const reachable = await brokerReachable();
const suffix = crypto.randomUUID().slice(0, 8);
const WORK_QUEUE = `bunstone.work.${suffix}`;
const DLQ = `bunstone.work.dlq.${suffix}`;

const received: unknown[] = [];
const deadLettered: unknown[] = [];
let resolveWork: () => void;
let resolveDead: () => void;
const workDone = new Promise<void>((r) => {
	resolveWork = r;
});
const deadDone = new Promise<void>((r) => {
	resolveDead = r;
});

@RabbitConsumer()
@Injectable()
class WorkConsumer {
	@RabbitSubscribe({ queue: WORK_QUEUE })
	async onWork(message: RabbitMessage<{ id: number }>) {
		if (message.data.id === 666) throw new Error("cursed message");
		received.push(message.data);
		resolveWork();
	}

	@RabbitSubscribe({ queue: DLQ })
	async onDead(message: RabbitMessage<{ id: number }>) {
		deadLettered.push(message.data);
		resolveDead();
	}
}

@Module({
	imports: [
		RabbitMQModule.register({
			uri: URI,
			queues: [{ name: WORK_QUEUE, deadLetterQueue: DLQ }, { name: DLQ }],
			retry: { maxAttempts: 1 },
		}),
	],
	providers: [WorkConsumer],
})
class AppModule {}

let app: Application;

beforeAll(async () => {
	if (!reachable) return;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
});

afterAll(async () => {
	await app?.close();
});

describe.skipIf(!reachable)("RabbitMQ E2E", () => {
	it("delivers a published message to its consumer", async () => {
		const rabbit = app.resolve(RabbitMQService);
		await rabbit.sendToQueue(WORK_QUEUE, { id: 1 });
		await Promise.race([workDone, timeout(4000)]);
		expect(received).toContainEqual({ id: 1 });
	});

	it("routes a failing message to the DLQ", async () => {
		const rabbit = app.resolve(RabbitMQService);
		await rabbit.sendToQueue(WORK_QUEUE, { id: 666 });
		await Promise.race([deadDone, timeout(4000)]);
		expect(deadLettered).toContainEqual({ id: 666 });
	});
});

function timeout(ms: number): Promise<void> {
	return new Promise((_, reject) =>
		setTimeout(() => reject(new Error("timeout")), ms),
	);
}
