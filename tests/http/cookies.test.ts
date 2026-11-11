import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Cookie, Ctx } from "@/http/params";
import { Controller, Get, Post } from "@/http/routing";
import type { RequestContext } from "@/http/types";
import { buildOpenApiDocument } from "@/openapi/builder";
import { Test } from "@/testing";

const Prefs = z.object({ theme: z.enum(["light", "dark"]) });

@Controller("session")
class SessionController {
	@Get()
	read(@Cookie("sid") sid?: string) {
		return { sid: sid ?? null };
	}

	@Get("all")
	all(@Cookie() cookies: Record<string, string>) {
		return cookies;
	}

	@Get("prefs")
	prefs(@Cookie(Prefs) prefs: z.infer<typeof Prefs>) {
		return prefs;
	}

	@Post()
	login(@Ctx() ctx: RequestContext) {
		ctx.cookies.set("sid", "abc", { httpOnly: true });
		return { ok: true };
	}

	@Post("logout")
	logout(@Ctx() ctx: RequestContext) {
		ctx.cookies.delete("sid");
		return null;
	}
}

@Module({ controllers: [SessionController] })
class AppModule {}

describe("cookies on the live server", () => {
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

	afterAll(() => app.close());

	it("reads a cookie by name", async () => {
		const res = await fetch(`${base}/session`, {
			headers: { cookie: "sid=xyz; other=1" },
		});
		expect(await res.json()).toEqual({ sid: "xyz" });
	});

	it("reads every cookie", async () => {
		const res = await fetch(`${base}/session/all`, {
			headers: { cookie: "a=1; b=2" },
		});
		expect(await res.json()).toEqual({ a: "1", b: "2" });
	});

	it("validates cookies with a schema", async () => {
		const ok = await fetch(`${base}/session/prefs`, {
			headers: { cookie: "theme=dark" },
		});
		expect(await ok.json()).toEqual({ theme: "dark" });

		const bad = await fetch(`${base}/session/prefs`, {
			headers: { cookie: "theme=blue" },
		});
		expect(bad.status).toBe(400);
	});

	it("sends a cookie set by the handler exactly once", async () => {
		const res = await fetch(`${base}/session`, { method: "POST" });
		const setCookies = res.headers.getSetCookie();
		expect(setCookies).toHaveLength(1);
		expect(setCookies[0]).toContain("sid=abc");
		expect(setCookies[0]).toContain("HttpOnly");
	});
});

describe("cookies in TestApp", () => {
	it("behaves like the live server", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [SessionController],
		}).compile();
		const app = moduleRef.createTestApp();

		const read = await app.get("/session", { headers: { cookie: "sid=t" } });
		expect(await read.json()).toEqual({ sid: "t" });

		const login = await app.post("/session");
		expect(login.headers.getSetCookie()).toHaveLength(1);
		expect(login.headers.getSetCookie()[0]).toContain("sid=abc");

		const logout = await app.post("/session/logout", undefined, {
			headers: { cookie: "sid=abc" },
		});
		expect(logout.status).toBe(204);
		expect(logout.headers.getSetCookie()[0]).toMatch(/^sid=;/);
		await moduleRef.close();
	});
});

describe("cookies in OpenAPI", () => {
	it("documents a named cookie parameter", () => {
		const doc = buildOpenApiDocument([SessionController], {
			title: "t",
			version: "1",
		}) as {
			paths: Record<string, Record<string, { parameters?: unknown[] }>>;
		};
		expect(doc.paths["/session"]?.get?.parameters).toContainEqual({
			name: "sid",
			in: "cookie",
			required: false,
			schema: { type: "string" },
		});
	});
});
