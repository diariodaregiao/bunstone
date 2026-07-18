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
const CONTAINER = process.env.RABBITMQ_CONTAINER;

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

const canRun =
	process.env.RABBITMQ_CHAOS === "1" &&
	Boolean(CONTAINER) &&
	(await brokerReachable());
const QUEUE = `bunstone.reconnect.${crypto.randomUUID().slice(0, 8)}`;
const received: number[] = [];

@RabbitConsumer()
@Injectable()
class ReconnectConsumer {
	@RabbitSubscribe({ queue: QUEUE })
	async onMessage(message: RabbitMessage<{ id: number }>) {
		received.push(message.data.id);
	}
}

@Module({
	imports: [
		RabbitMQModule.register({
			uri: URI,
			reconnect: { delayMs: 500 },
			queues: [{ name: QUEUE }],
		}),
	],
	providers: [ReconnectConsumer],
})
class AppModule {}

let app: Application;

beforeAll(async () => {
	if (!canRun) return;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
});

afterAll(async () => {
	if (canRun) await app.close();
});

async function waitFor(id: number, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (received.includes(id)) return;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(`message ${id} not received within ${timeoutMs}ms`);
}

describe.skipIf(!canRun)("RabbitMQ reconnection", () => {
	it("re-registers consumers after the broker restarts", async () => {
		const rabbit = app.resolve(RabbitMQService);

		await rabbit.sendToQueue(QUEUE, { id: 1 });
		await waitFor(1, 4000);

		const restart = Bun.spawn(["docker", "restart", CONTAINER as string], {
			stdout: "ignore",
			stderr: "ignore",
		});
		expect(await restart.exited).toBe(0);

		await rabbit.sendToQueue(QUEUE, { id: 2 });
		await waitFor(2, 25000);

		expect(received).toContain(1);
		expect(received).toContain(2);
	}, 40000);
});
