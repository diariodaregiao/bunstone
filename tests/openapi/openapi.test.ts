import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Body, Param, Query } from "@/http/params";
import { Controller, Get, Post } from "@/http/routing";
import { ApiOperation, ApiResponse, ApiTags } from "@/openapi/decorators";

const CreateUser = z.object({ name: z.string().min(2), age: z.number() });

@ApiTags("Users")
@Controller("users")
class UsersController {
	@Get(":id")
	@ApiOperation({ summary: "Get a user" })
	@ApiResponse({ status: 200, description: "found" })
	@ApiResponse({ status: 404, description: "missing" })
	one(@Param("id") id: string, @Query("expand") expand?: string) {
		return { id, expand };
	}

	@Post()
	@ApiOperation({ summary: "Create a user" })
	create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
		return body;
	}
}

@Module({ controllers: [UsersController] })
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
		openapi: { info: { title: "Test API", version: "1.0.0" }, ui: true },
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("OpenAPI", () => {
	it("serves a valid document with paths and tags", async () => {
		const res = await fetch(`${base}/openapi.json`);
		expect(res.status).toBe(200);
		const doc = (await res.json()) as any;

		expect(doc.openapi).toBe("3.1.0");
		expect(doc.info).toEqual({ title: "Test API", version: "1.0.0" });
		expect(doc.paths["/users/{id}"].get.summary).toBe("Get a user");
		expect(doc.paths["/users/{id}"].get.tags).toContain("Users");
	});

	it("describes path and query parameters", async () => {
		const res = await fetch(`${base}/openapi.json`);
		const doc = (await res.json()) as any;
		const params = doc.paths["/users/{id}"].get.parameters;

		expect(params).toContainEqual({
			name: "id",
			in: "path",
			required: true,
			schema: { type: "string" },
		});
		expect(
			params.some((p: any) => p.name === "expand" && p.in === "query"),
		).toBe(true);
	});

	it("derives the request body schema from zod", async () => {
		const res = await fetch(`${base}/openapi.json`);
		const doc = (await res.json()) as any;
		const schema =
			doc.paths["/users"].post.requestBody.content["application/json"].schema;

		expect(schema.required).toContain("name");
		expect(schema.properties.age.type).toBe("number");
	});

	it("lists documented responses", async () => {
		const res = await fetch(`${base}/openapi.json`);
		const doc = (await res.json()) as any;
		expect(Object.keys(doc.paths["/users/{id}"].get.responses).sort()).toEqual([
			"200",
			"404",
		]);
	});

	it("serves the swagger ui page", async () => {
		const res = await fetch(`${base}/docs`);
		expect(res.headers.get("content-type")).toContain("text/html");
		expect(await res.text()).toContain("swagger");
	});
});
