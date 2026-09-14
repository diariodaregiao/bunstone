import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit } from "@/ratelimit";

@Controller("api")
class ApiController {
	@Get("limited")
	@RateLimit({ max: 2, windowMs: 60_000 })
	limited() {
		return { ok: true };
	}
}

@Module({ controllers: [ApiController] })
class AppModule {}

describe("HEAD shares GET rate limit budget", () => {
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

	it("HEAD consumes the same bucket as GET", async () => {
		expect((await fetch(`${base}/api/limited`)).status).toBe(200);
		expect(
			(await fetch(`${base}/api/limited`, { method: "HEAD" })).status,
		).toBe(200);
		expect(
			(await fetch(`${base}/api/limited`, { method: "HEAD" })).status,
		).toBe(429);
	});
});
