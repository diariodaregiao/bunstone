import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Injectable } from "@/core/injectable";
import { type GuardContract, UseGuards } from "@/http/guard";
import { Body, Param } from "@/http/params";
import { Controller, Get, Post } from "@/http/routing";
import type { RequestContext } from "@/http/types";
import { Test } from "@/testing/testing-module";

@Injectable()
class UsersService {
	findAll() {
		return [{ id: 1, name: "real" }];
	}
}

@Injectable()
class AdminGuard implements GuardContract {
	canActivate(ctx: RequestContext): boolean {
		return ctx.headers.get("x-admin") === "yes";
	}
}

const CreateUser = z.object({ name: z.string().min(2) });

@Controller("users")
class UsersController {
	constructor(private readonly users: UsersService) {}

	@Get()
	list() {
		return this.users.findAll();
	}

	@Get(":id")
	one(@Param("id") id: string) {
		return { id };
	}

	@Post()
	create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
		return { created: body };
	}

	@Get("admin/secret")
	@UseGuards(AdminGuard)
	secret() {
		return { secret: true };
	}
}

describe("Test module", () => {
	it("resolves providers and overrides them with mocks", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [UsersService, AdminGuard],
		})
			.overrideProvider(UsersService)
			.useValue({ findAll: () => [{ id: 99, name: "mock" }] })
			.compile();

		expect(moduleRef.get(UsersService).findAll()).toEqual([
			{ id: 99, name: "mock" },
		]);
	});

	it("dispatches requests in-memory through the full pipeline", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [UsersService, AdminGuard],
		}).compile();
		const app = moduleRef.createTestApp();

		const list = await app.get("/users");
		expect(await list.json()).toEqual([{ id: 1, name: "real" }]);

		const one = await app.get("/users/7");
		expect(await one.json()).toEqual({ id: "7" });
	});

	it("runs validation and returns 400 on bad input", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [UsersService, AdminGuard],
		}).compile();
		const app = moduleRef.createTestApp();

		expect((await app.post("/users", { name: "ok" })).status).toBe(200);
		expect((await app.post("/users", { name: "x" })).status).toBe(400);
	});

	it("enforces guards", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [UsersService, AdminGuard],
		}).compile();
		const app = moduleRef.createTestApp();

		expect((await app.get("/users/admin/secret")).status).toBe(403);
		expect(
			(await app.get("/users/admin/secret", { headers: { "x-admin": "yes" } }))
				.status,
		).toBe(200);
	});
});
