import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";

@Controller("dup")
class First {
	@Get("x")
	x() {
		return { from: "first" };
	}
}

@Controller("dup")
class Second {
	@Get("x")
	x() {
		return { from: "second" };
	}
}

@Controller("health")
class HealthController {
	@Get()
	mine() {
		return { mine: true };
	}
}

describe("route collisions", () => {
	it("rejects two handlers on the same method and path", async () => {
		@Module({ controllers: [First, Second] })
		class AppModule {}

		await expect(
			Application.create(AppModule, {
				gracefulShutdown: false,
				logStartup: false,
			}),
		).rejects.toThrow(/Duplicate route/);
	});

	it("refuses to let a built-in route replace a controller", async () => {
		@Module({ controllers: [HealthController] })
		class AppModule {}

		await expect(
			Application.create(AppModule, {
				gracefulShutdown: false,
				logStartup: false,
				health: true,
			}),
		).rejects.toThrow(/already handles it/);
	});

	it("still mounts built-in routes when nothing conflicts", async () => {
		@Module({ controllers: [First] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
			health: true,
		});
		app.listen(0);
		const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";

		expect(await (await fetch(`${base}/health`)).json()).toEqual({
			status: "ok",
		});
		await app.close();
	});
});
