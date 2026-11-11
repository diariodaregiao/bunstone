import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Param } from "@/http/params";
import { Controller, Get } from "@/http/routing";
import { RateLimitModule } from "@/ratelimit";

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
		RateLimitModule.register({ max: 2, windowMs: 60_000, scope: "module" }),
		UsersModule,
	],
	controllers: [AdminController],
})
class AdminModule {}

@Module({ imports: [AdminModule] })
class AppModule {}

describe("RateLimitModule scope: module", () => {
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

	it("limits controllers declared in the importing module only", async () => {
		expect((await fetch(`${base}/admin`)).status).toBe(200);
		expect((await fetch(`${base}/admin`)).status).toBe(200);
		expect((await fetch(`${base}/admin`)).status).toBe(429);
	});

	it("does not limit controllers from imported modules", async () => {
		for (let i = 0; i < 5; i++) {
			expect((await fetch(`${base}/users/1`)).status).toBe(200);
		}
	});
});
