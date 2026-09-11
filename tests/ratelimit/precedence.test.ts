import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit, RateLimitModule } from "@/ratelimit";

@RateLimit({ max: 3, windowMs: 60_000, message: "controller" })
@Controller("scoped")
class MethodController {
	@Get("method")
	@RateLimit({ max: 1, windowMs: 60_000, message: "method" })
	method() {
		return { level: "method" };
	}

	@Get("class-only")
	classOnly() {
		return { level: "class" };
	}
}

@Controller("scoped")
class ModuleOnlyController {
	@Get("module-only")
	moduleOnly() {
		return { level: "module" };
	}
}

@Controller("scoped/prefix-only")
class PrefixOnlyController {
	@Get()
	prefixOnly() {
		return { level: "prefix" };
	}
}

@Controller("open")
class OpenController {
	@Get()
	open() {
		return { ok: true };
	}
}

@Controller("global-only")
class GlobalOnlyController {
	@Get()
	only() {
		return { ok: true };
	}
}

@Module({
	imports: [RateLimitModule.register({ max: 2, windowMs: 60_000 })],
	controllers: [MethodController, ModuleOnlyController],
})
class LimitedModule {}

@Module({ controllers: [PrefixOnlyController] })
class PrefixModule {}

@Module({ controllers: [OpenController] })
class OpenModule {}

@Module({ imports: [LimitedModule, PrefixModule, OpenModule] })
class AppModule {}

@Module({ controllers: [GlobalOnlyController] })
class GlobalOnlyModule {}

describe("rate limit precedence", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: {
				max: 100,
				windowMs: 60_000,
				message: "global",
				prefixes: [
					{
						path: "/scoped/prefix-only",
						max: 4,
						windowMs: 60_000,
						message: "prefix",
					},
				],
			},
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("method @RateLimit wins over controller, module, prefix, and global", async () => {
		expect((await fetch(`${base}/scoped/method`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/method`)).status).toBe(429);
		const res = await fetch(`${base}/scoped/method`);
		expect(await res.json()).toEqual({ message: "method" });
	});

	it("controller @RateLimit wins over module, prefix, and global", async () => {
		expect((await fetch(`${base}/scoped/class-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/class-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/class-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/class-only`)).status).toBe(429);
	});

	it("module RateLimit wins over prefix and global", async () => {
		expect((await fetch(`${base}/scoped/module-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/module-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/module-only`)).status).toBe(429);
	});

	it("prefix wins over global default", async () => {
		expect((await fetch(`${base}/scoped/prefix-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/prefix-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/prefix-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/prefix-only`)).status).toBe(200);
		expect((await fetch(`${base}/scoped/prefix-only`)).status).toBe(429);
		const res = await fetch(`${base}/scoped/prefix-only`);
		expect(await res.json()).toEqual({ message: "prefix" });
	});

	it("global default applies when nothing more specific matches", async () => {
		const limited = await Application.create(GlobalOnlyModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: { max: 5, windowMs: 60_000, message: "global" },
		});
		limited.listen(0);
		const limitedBase = limited.getServer()?.url.href.replace(/\/$/, "") ?? "";
		try {
			for (let i = 0; i < 5; i++) {
				expect((await fetch(`${limitedBase}/global-only`)).status).toBe(200);
			}
			expect((await fetch(`${limitedBase}/global-only`)).status).toBe(429);
		} finally {
			await limited.close();
		}
	});

	it("sibling modules are not module-limited", async () => {
		for (let i = 0; i < 6; i++) {
			expect((await fetch(`${base}/open`)).status).toBe(200);
		}
	});
});
