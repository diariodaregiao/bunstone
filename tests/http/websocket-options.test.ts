import "reflect-metadata";
import { afterEach, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import {
	type Socket,
	WebSocketGateway,
	type WebSocketHandler,
} from "@/http/websocket";

@WebSocketGateway("/room")
@Injectable()
class RoomGateway implements WebSocketHandler {
	open(socket: Socket) {
		socket.subscribe("room");
	}

	message(socket: Socket, data: unknown) {
		socket.publish("room", JSON.stringify(data));
	}
}

@Module({ providers: [RoomGateway] })
class AppModule {}

const base = { gracefulShutdown: false, logStartup: false };
type ServeOptions = Parameters<typeof Bun.serve>[0];

function connect(url: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		ws.addEventListener("open", () => resolve(ws), { once: true });
		ws.addEventListener("error", reject, { once: true });
	});
}

describe("WebSocket server options", () => {
	const apps: Application[] = [];
	const originalServe = Bun.serve;

	afterEach(async () => {
		Bun.serve = originalServe;
		for (const app of apps.splice(0)) await app.close();
	});

	it("passes Bun's WebSocket settings and reusePort through", async () => {
		let seen: ServeOptions | undefined;
		Bun.serve = ((options: ServeOptions) => {
			seen = options;
			return originalServe(options);
		}) as typeof Bun.serve;

		const app = await Application.create(AppModule, {
			...base,
			reusePort: true,
			websocket: {
				perMessageDeflate: true,
				backpressureLimit: 1024,
				maxPayloadLength: 4096,
			},
		});
		apps.push(app);
		app.listen(0);

		const ws = (seen as { websocket?: Record<string, unknown> }).websocket;
		expect(ws?.perMessageDeflate).toBe(true);
		expect(ws?.backpressureLimit).toBe(1024);
		expect(ws?.maxPayloadLength).toBe(4096);
		expect(typeof ws?.message).toBe("function");
		expect((seen as { reusePort?: boolean }).reusePort).toBe(true);
	});

	it("supports Bun's native pub/sub from a gateway", async () => {
		const app = await Application.create(AppModule, base);
		apps.push(app);
		app.listen(0);
		const url = `ws://localhost:${app.getServer()?.port}/room`;

		const alice = await connect(url);
		const bob = await connect(url);
		const received = new Promise<unknown>((resolve) =>
			bob.addEventListener(
				"message",
				(event) => resolve(JSON.parse(String(event.data))),
				{ once: true },
			),
		);
		alice.send(JSON.stringify({ hi: "bob" }));
		expect(await received).toEqual({ hi: "bob" });

		// the server can broadcast to the same topic from anywhere
		const broadcast = new Promise<unknown>((resolve) =>
			alice.addEventListener(
				"message",
				(event) => resolve(JSON.parse(String(event.data))),
				{ once: true },
			),
		);
		app.getServer()?.publish("room", JSON.stringify({ from: "server" }));
		expect(await broadcast).toEqual({ from: "server" });

		alice.close();
		bob.close();
	});
});
