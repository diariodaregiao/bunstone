import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Param } from "@/http/params";
import { Controller, Get } from "@/http/routing";

@Controller("users")
class UsersController {
	@Get(":id")
	byId(@Param("id") id: string) {
		return { id };
	}
}

@Module({ controllers: [UsersController] })
class AppModule {}

describe("global rate limit route template keying", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		app = await Application.create(AppModule, {
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

	it("counts a parameterised route as one bucket under the global limit", async () => {
		const statuses = [];
		for (let i = 0; i < 4; i++) {
			statuses.push((await fetch(`${base}/users/${i}`)).status);
		}
		expect(statuses).toEqual([200, 200, 429, 429]);
	});
});
