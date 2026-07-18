import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit } from "@/ratelimit/decorator";
import { MemoryStorage } from "@/ratelimit/storage";

@Controller("api")
class ApiController {
	@Get("limited")
	@RateLimit({ max: 2, windowMs: 10_000, message: "slow down" })
	limited() {
		return { ok: true };
	}

	@Get("open")
	open() {
		return { ok: true };
	}
}

@Module({ controllers: [ApiController] })
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

describe("Rate limiting", () => {
	it("allows requests within the limit and sets headers", async () => {
		const res = await fetch(`${base}/api/limited`);
		expect(res.status).toBe(200);
		expect(res.headers.get("x-ratelimit-limit")).toBe("2");
		expect(res.headers.get("x-ratelimit-remaining")).toBe("1");
	});

	it("blocks with 429 once the limit is exceeded", async () => {
		await fetch(`${base}/api/limited`);
		const res = await fetch(`${base}/api/limited`);
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBeDefined();
		expect(await res.json()).toEqual({ message: "slow down" });
	});

	it("does not rate limit unmarked routes", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/api/open`)).status).toBe(200);
		}
	});
});

describe("MemoryStorage", () => {
	it("resets after the window and never locks out", async () => {
		const storage = new MemoryStorage();
		const first = await storage.hit("k", 1, 20);
		expect(first.allowed).toBe(true);
		const second = await storage.hit("k", 1, 20);
		expect(second.allowed).toBe(false);

		await new Promise((r) => setTimeout(r, 30));
		const third = await storage.hit("k", 1, 20);
		expect(third.allowed).toBe(true);
		storage.close();
	});
});
