import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Param } from "@/http/params";
import { Controller, Get } from "@/http/routing";

@Controller("auth")
class AuthController {
	@Get("login")
	login() {
		return { ok: true };
	}

	@Get(":id")
	byId(@Param("id") id: string) {
		return { id };
	}

	@Get("admin/staff")
	adminStaff() {
		return { ok: true };
	}
}

@Controller("authentication")
class AuthenticationController {
	@Get()
	list() {
		return { ok: true };
	}
}

@Module({ controllers: [AuthController, AuthenticationController] })
class AppModule {}

describe("rate limit path prefix", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			rateLimit: {
				max: 100,
				windowMs: 60_000,
				prefixes: [
					{ path: "/auth/admin", max: 1, windowMs: 60_000, message: "admin" },
					{ path: "/auth", max: 2, windowMs: 60_000, message: "auth" },
				],
			},
		});
		app.listen(0);
		base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("applies the prefix limit per route template", async () => {
		expect((await fetch(`${base}/auth/login`)).status).toBe(200);
		expect((await fetch(`${base}/auth/login`)).status).toBe(200);
		expect((await fetch(`${base}/auth/login`)).status).toBe(429);

		expect((await fetch(`${base}/auth/1`)).status).toBe(200);
		expect((await fetch(`${base}/auth/2`)).status).toBe(200);
		expect((await fetch(`${base}/auth/3`)).status).toBe(429);
	});

	it("does not match routes outside the prefix", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/authentication`)).status).toBe(200);
		}
	});

	it("uses the longest matching prefix", async () => {
		expect((await fetch(`${base}/auth/admin/staff`)).status).toBe(200);
		expect((await fetch(`${base}/auth/admin/staff`)).status).toBe(429);
		const res = await fetch(`${base}/auth/admin/staff`);
		expect(await res.json()).toEqual({ message: "admin" });
	});
});
