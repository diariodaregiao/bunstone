import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Param } from "@/http/params";
import { Controller, Get } from "@/http/routing";
import { getRateLimit, RateLimit } from "@/ratelimit/decorator";

@Controller("users")
class UsersController {
	@Get(":id")
	@RateLimit({ max: 2, windowMs: 60_000 })
	byId(@Param("id") id: string) {
		return { id };
	}
}

@RateLimit({ max: 1, windowMs: 60_000 })
@Controller("v2")
class LimitedBase {}

class InheritingController extends LimitedBase {
	@Get("x")
	x() {
		return { ok: true };
	}
}

@Module({ controllers: [UsersController, InheritingController] })
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

describe("rate limit keying", () => {
	it("counts a parameterised route as one bucket", async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 4; i++) {
			statuses.push((await fetch(`${base}/users/${i}`)).status);
		}

		// varying the parameter must not mint a fresh bucket per request
		expect(statuses).toEqual([200, 200, 429, 429]);
	});

	it("inherits a class-level limit into a subclass controller", () => {
		expect(getRateLimit(InheritingController, "x")).toEqual({
			max: 1,
			windowMs: 60_000,
		});
	});
});
