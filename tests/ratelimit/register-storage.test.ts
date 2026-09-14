import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimitModule } from "@/ratelimit";
import { REDIS_URL, redisReachable } from "../support/services";

@Controller("api")
class ApiController {
	@Get("limited")
	limited() {
		return { ok: true };
	}
}

@Module({
	imports: [RateLimitModule.registerStorage({ url: REDIS_URL })],
	controllers: [ApiController],
})
class AppModule {}

const redisUp = await redisReachable();

describe.skipIf(!redisUp)("RateLimitModule.registerStorage", () => {
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

	it("limits routes through DI-provided Redis storage", async () => {
		expect((await fetch(`${base}/api/limited`)).status).toBe(200);
		expect((await fetch(`${base}/api/limited`)).status).toBe(200);
		expect((await fetch(`${base}/api/limited`)).status).toBe(429);
	});
});
