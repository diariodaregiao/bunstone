import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import {
	type Socket,
	WebSocketGateway,
	type WebSocketHandler,
} from "@/http/websocket";

@Injectable()
class ClockService {
	stamp() {
		return "tick";
	}
}

@WebSocketGateway("/ws")
@Injectable()
class EchoGateway implements WebSocketHandler {
	constructor(private readonly clock: ClockService) {}

	open(socket: Socket) {
		socket.send(JSON.stringify({ hello: true }));
	}

	message(socket: Socket, data: unknown) {
		socket.send(JSON.stringify({ echo: data, at: this.clock.stamp() }));
	}
}

@Module({ providers: [ClockService, EchoGateway] })
class AppModule {}

let app: Application;
let wsUrl: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	const port = app.getServer()?.port;
	wsUrl = `ws://localhost:${port}/ws`;
});

afterAll(async () => {
	await app.close();
});

function nextMessage(ws: WebSocket): Promise<unknown> {
	return new Promise((resolve) => {
		ws.addEventListener(
			"message",
			(event) => resolve(JSON.parse(String(event.data))),
			{ once: true },
		);
	});
}

describe("WebSocket gateway", () => {
	it("greets on open and echoes messages with DI", async () => {
		const ws = new WebSocket(wsUrl);
		await new Promise((resolve) =>
			ws.addEventListener("open", resolve, { once: true }),
		);

		const greeting = await nextMessage(ws);
		expect(greeting).toEqual({ hello: true });

		const echoed = nextMessage(ws);
		ws.send(JSON.stringify({ n: 5 }));
		expect(await echoed).toEqual({ echo: { n: 5 }, at: "tick" });

		ws.close();
	});
});
