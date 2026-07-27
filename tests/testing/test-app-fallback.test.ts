import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get, Post } from "@/http/routing";
import { Test } from "@/testing/testing-module";

@Controller("items")
class ItemsController {
	@Get()
	list() {
		return [];
	}

	@Post()
	create() {
		return { created: true };
	}

	@Get(":id")
	one() {
		return { one: true };
	}
}

@Module({ controllers: [ItemsController] })
class ItemsModule {}

describe("TestApp mirrors the real fallback", () => {
	let app: Application;
	let origin: string;

	beforeAll(async () => {
		app = await Application.create(ItemsModule, {
			logStartup: false,
			gracefulShutdown: false,
		});
		app.listen(0);
		origin = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	});

	afterAll(async () => {
		await app.close();
	});

	it("returns 405 with an Allow header when the method is unsupported", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [ItemsController],
		}).compile();
		const testApp = moduleRef.createTestApp();

		const fromTest = await testApp.put("/items", {});
		const fromServer = await fetch(`${origin}/items`, {
			method: "PUT",
			body: "{}",
		});

		expect(fromTest.status).toBe(405);
		expect(fromServer.status).toBe(405);
		expect(fromTest.headers.get("allow")).toBe(
			fromServer.headers.get("allow") ?? "",
		);
		expect(fromTest.headers.get("allow")).toContain("GET");
		expect(fromTest.headers.get("allow")).toContain("POST");
		expect(await fromTest.json()).toEqual(await fromServer.json());

		await moduleRef.close();
	});

	it("returns 404 when no route matches the path", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [ItemsController],
		}).compile();
		const testApp = moduleRef.createTestApp();

		const fromTest = await testApp.get("/nope/deep");
		const fromServer = await fetch(`${origin}/nope/deep`);

		expect(fromTest.status).toBe(404);
		expect(fromServer.status).toBe(404);
		expect(await fromTest.json()).toEqual(await fromServer.json());

		await moduleRef.close();
	});
});
