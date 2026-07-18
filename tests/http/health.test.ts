import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Controller()
class SlowController {
	@Get("slow")
	async slow() {
		await sleep(80);
		return { ok: true };
	}
}

@Module({ controllers: [SlowController] })
class AppModule {}

describe("Health & graceful shutdown", () => {
	it("serves /health and /ready when up", async () => {
		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			health: true,
		});
		app.listen(0);
		const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";

		expect((await fetch(`${base}/health`)).status).toBe(200);
		const ready = await fetch(`${base}/ready`);
		expect(ready.status).toBe(200);
		expect(await ready.json()).toEqual({ status: "ready" });

		await app.close();
	});

	it("reports 503 on /ready when a check fails", async () => {
		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			health: { checks: [() => false] },
		});
		app.listen(0);
		const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";

		expect((await fetch(`${base}/ready`)).status).toBe(503);
		expect((await fetch(`${base}/health`)).status).toBe(200);
		await app.close();
	});

	it("drains in-flight requests during shutdown", async () => {
		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		app.listen(0);
		const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";

		const inflight = fetch(`${base}/slow`);
		await sleep(20);
		await app.close();

		const res = await inflight;
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});
});
