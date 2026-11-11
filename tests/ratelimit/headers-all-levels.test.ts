import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit, RateLimitModule } from "@/ratelimit";

function expectRateLimitHeaders(res: Response, limit: string) {
	expect(res.headers.get("x-ratelimit-limit")).toBe(limit);
	expect(res.headers.get("x-ratelimit-remaining")).toBeDefined();
	expect(res.headers.get("x-ratelimit-reset")).toBeDefined();
}

@Controller("api")
class RouteController {
	@Get("route")
	@RateLimit({ max: 2, windowMs: 60_000, message: "route" })
	route() {
		return { ok: true };
	}
}

@Controller("module")
class ModuleController {
	@Get()
	module() {
		return { ok: true };
	}
}

@Controller("global")
class GlobalController {
	@Get()
	global() {
		return { ok: true };
	}
}

@Module({
	imports: [
		RateLimitModule.register({ max: 2, windowMs: 60_000, message: "module" }),
	],
	controllers: [RouteController, ModuleController],
})
class LimitedModule {}

@Module({
	imports: [LimitedModule],
	controllers: [GlobalController],
})
class AppModule {}

describe("rate limit headers at every level", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: { max: 2, windowMs: 60_000, message: "global" },
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("sets X-RateLimit-* on a method-level limit", async () => {
		const ok = await fetch(`${base}/api/route`);
		expectRateLimitHeaders(ok, "2");
		await fetch(`${base}/api/route`);
		const blocked = await fetch(`${base}/api/route`);
		expect(blocked.status).toBe(429);
		expectRateLimitHeaders(blocked, "2");
		expect(blocked.headers.get("retry-after")).toBeDefined();
	});

	it("sets X-RateLimit-* on a module-level limit", async () => {
		const ok = await fetch(`${base}/module`);
		expectRateLimitHeaders(ok, "2");
		await fetch(`${base}/module`);
		const blocked = await fetch(`${base}/module`);
		expect(blocked.status).toBe(429);
		expectRateLimitHeaders(blocked, "2");
		expect(blocked.headers.get("retry-after")).toBeDefined();
	});

	it("sets X-RateLimit-* on a global limit", async () => {
		const ok = await fetch(`${base}/global`);
		expectRateLimitHeaders(ok, "2");
		await fetch(`${base}/global`);
		const blocked = await fetch(`${base}/global`);
		expect(blocked.status).toBe(429);
		expectRateLimitHeaders(blocked, "2");
		expect(blocked.headers.get("retry-after")).toBeDefined();
	});
});
