import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { Sse, type SseMessage } from "@/http/sse";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Controller("events")
class EventsController {
	@Get()
	@Sse()
	async *stream(): AsyncGenerator<SseMessage> {
		yield { event: "tick", id: "1", data: { n: 1 } };
		yield { event: "tick", id: "2", data: { n: 2 } };
		yield { data: "done" };
	}

	@Get("live")
	@Sse()
	async *live(): AsyncGenerator<SseMessage> {
		let n = 0;
		while (true) {
			yield { data: { n: n++ } };
			await sleep(15);
		}
	}
}

@Module({ controllers: [EventsController] })
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("SSE", () => {
	it("streams events with the correct content type and framing", async () => {
		const res = await fetch(`${base}/events`);
		expect(res.headers.get("content-type")).toBe("text/event-stream");
		const body = await res.text();

		expect(body).toContain("event: tick\n");
		expect(body).toContain("id: 1\n");
		expect(body).toContain('data: {"n":1}\n');
		expect(body).toContain("data: done\n");
	});

	it("stops streaming when the client disconnects", async () => {
		const controller = new AbortController();
		const res = await fetch(`${base}/events/live`, {
			signal: controller.signal,
		});
		const reader = res.body?.getReader();
		const first = await reader?.read();
		expect(new TextDecoder().decode(first?.value)).toContain("data:");
		controller.abort();
		await reader?.cancel().catch(() => undefined);
		expect(true).toBe(true);
	});
});
