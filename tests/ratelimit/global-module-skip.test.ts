import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Param } from "@/http/params";
import { Controller, Get } from "@/http/routing";
import { RateLimit, RateLimitModule, SkipRateLimit } from "@/ratelimit";

@Controller("public")
class PublicController {
	@Get()
	list() {
		return { ok: true };
	}
}

@Controller("users")
class UsersController {
	@Get(":id")
	byId(@Param("id") id: string) {
		return { id };
	}
}

@Module({ controllers: [UsersController] })
class UsersModule {}

@Controller("admin")
class AdminController {
	@Get()
	dashboard() {
		return { admin: true };
	}
}

@Module({
	imports: [
		RateLimitModule.register({ max: 2, windowMs: 60_000 }),
		UsersModule,
	],
	controllers: [AdminController],
})
class AdminModule {}

@Module({ controllers: [PublicController] })
class PublicModule {}

@Module({
	imports: [AdminModule, PublicModule],
})
class AppWithModuleScope {}

@Controller("api")
class GlobalApiController {
	@Get("limited")
	limited() {
		return { ok: true };
	}

	@Get("open")
	@SkipRateLimit()
	open() {
		return { ok: true };
	}

	@Get("override")
	@RateLimit({ max: 1, windowMs: 60_000, message: "override" })
	override() {
		return { ok: true };
	}

	@Get("excluded")
	excluded() {
		return { ok: true };
	}
}

@SkipRateLimit()
@Controller("skipped")
class SkippedController {
	@Get()
	all() {
		return { ok: true };
	}
}

@Module({ controllers: [GlobalApiController, SkippedController] })
class GlobalAppModule {}

@Module({ controllers: [GlobalApiController] })
class GlobalSkipAppModule {}

describe("global rate limit", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(GlobalAppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: { max: 2, windowMs: 60_000 },
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("limits routes without @RateLimit", async () => {
		expect((await fetch(`${base}/api/limited`)).status).toBe(200);
		expect((await fetch(`${base}/api/limited`)).status).toBe(200);
		expect((await fetch(`${base}/api/limited`)).status).toBe(429);
	});

	it("skips routes marked with @SkipRateLimit", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/api/open`)).status).toBe(200);
		}
	});

	it("prefers method @RateLimit over global", async () => {
		expect((await fetch(`${base}/api/override`)).status).toBe(200);
		expect((await fetch(`${base}/api/override`)).status).toBe(429);
		const res = await fetch(`${base}/api/override`);
		expect(await res.json()).toEqual({ message: "override" });
	});

	it("skips every route on a controller marked with @SkipRateLimit", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/skipped`)).status).toBe(200);
		}
	});
});

describe("global rate limit skip paths", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(GlobalSkipAppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: {
				max: 1,
				windowMs: 60_000,
				skip: ["/api/excluded"],
			},
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("skips routes listed in rateLimit.skip", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/api/excluded`)).status).toBe(200);
		}
	});
});

describe("global rate limit and health probes", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(GlobalSkipAppModule, {
			gracefulShutdown: false,
			logStartup: false,
			health: true,
			rateLimit: { max: 1, windowMs: 60_000 },
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("never rate limits built-in /health and /ready", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/health`)).status).toBe(200);
			expect((await fetch(`${base}/ready`)).status).toBe(200);
		}
	});
});

describe("RateLimitModule scope", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(AppWithModuleScope, {
			gracefulShutdown: false,
			logStartup: false,
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("limits controllers in the scoped module and its imports", async () => {
		expect((await fetch(`${base}/admin`)).status).toBe(200);
		expect((await fetch(`${base}/admin`)).status).toBe(200);
		expect((await fetch(`${base}/admin`)).status).toBe(429);

		expect((await fetch(`${base}/users/1`)).status).toBe(200);
		expect((await fetch(`${base}/users/2`)).status).toBe(200);
		expect((await fetch(`${base}/users/3`)).status).toBe(429);
	});

	it("does not limit controllers outside the scoped subtree", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/public`)).status).toBe(200);
		}
	});
});
