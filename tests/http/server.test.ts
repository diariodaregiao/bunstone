import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { UnauthorizedException } from "@/http/exceptions";
import { type GuardContract, UseGuards } from "@/http/guard";
import { Body, Header, Param, Query } from "@/http/params";
import { Controller, Get, Post, SetHeader } from "@/http/routing";
import type { RequestContext } from "@/http/types";

@Injectable()
class GreetService {
	greet(name: string) {
		return `hello ${name}`;
	}
}

@Injectable()
class ApiKeyGuard implements GuardContract {
	canActivate(ctx: RequestContext): boolean {
		return ctx.headers.get("x-api-key") === "secret";
	}
}

const CreateUser = z.object({ name: z.string().min(2), age: z.number() });

@Controller("users")
class UsersController {
	constructor(private readonly greet: GreetService) {}

	@Get()
	list(@Query("q") q?: string) {
		return { list: ["ada", "linus"], q };
	}

	@Get(":id")
	findOne(@Param("id") id: string, @Header("x-trace") trace?: string) {
		return { id, trace, message: this.greet.greet(id) };
	}

	@Post()
	create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
		return { created: body };
	}

	@Get("xml/raw")
	@SetHeader("content-type", "application/xml")
	xml() {
		return "<ok/>";
	}

	@Get("secret/data")
	@UseGuards(ApiKeyGuard)
	secret() {
		return { secret: 42 };
	}

	@Get("boom/error")
	boom() {
		throw new UnauthorizedException("nope");
	}

	@Get("empty/void")
	empty() {
		return undefined;
	}
}

@Module({
	controllers: [UsersController],
	providers: [GreetService, ApiKeyGuard],
})
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

describe("HttpServer", () => {
	it("routes to a controller and injects services", async () => {
		const res = await fetch(`${base}/users/ada`, {
			headers: { "x-trace": "t1" },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: "ada",
			trace: "t1",
			message: "hello ada",
		});
	});

	it("reads query params", async () => {
		const res = await fetch(`${base}/users?q=dev`);
		expect(await res.json()).toEqual({ list: ["ada", "linus"], q: "dev" });
	});

	it("validates the body with zod and returns the parsed value", async () => {
		const res = await fetch(`${base}/users`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "bob", age: 30 }),
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ created: { name: "bob", age: 30 } });
	});

	it("rejects an invalid body with 400 and field errors", async () => {
		const res = await fetch(`${base}/users`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "x" }),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { errors: { field: string }[] };
		expect(body.errors.map((e) => e.field).sort()).toEqual(["age", "name"]);
	});

	it("applies @SetHeader", async () => {
		const res = await fetch(`${base}/users/xml/raw`);
		expect(res.headers.get("content-type")).toBe("application/xml");
		expect(await res.text()).toBe("<ok/>");
	});

	it("denies a guarded route without the header", async () => {
		const res = await fetch(`${base}/users/secret/data`);
		expect(res.status).toBe(403);
	});

	it("allows a guarded route with the header", async () => {
		const res = await fetch(`${base}/users/secret/data`, {
			headers: { "x-api-key": "secret" },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ secret: 42 });
	});

	it("maps HttpException to its status", async () => {
		const res = await fetch(`${base}/users/boom/error`);
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ message: "nope" });
	});

	it("returns 204 for a void handler", async () => {
		const res = await fetch(`${base}/users/empty/void`);
		expect(res.status).toBe(204);
	});

	it("returns 404 for an unknown route", async () => {
		const res = await fetch(`${base}/nope`);
		expect(res.status).toBe(404);
	});
});
