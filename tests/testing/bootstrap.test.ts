import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Injectable } from "@/core/injectable";
import type { OnApplicationBootstrap, OnModuleInit } from "@/core/lifecycle";
import { Controller, Get } from "@/http/routing";
import type { RateLimitStorage } from "@/ratelimit/storage";
import { Test } from "@/testing/testing-module";

@Injectable()
class Bootstrapped implements OnModuleInit, OnApplicationBootstrap {
	readonly calls: string[] = [];
	ready = false;

	onModuleInit() {
		this.calls.push("init");
	}

	onApplicationBootstrap() {
		this.calls.push("bootstrap");
		this.ready = true;
	}
}

@Controller("ping")
class PingController {
	@Get()
	ping() {
		return { ok: true };
	}
}

describe("TestingModule bootstrap", () => {
	it("runs onApplicationBootstrap like Application.create does", async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [Bootstrapped],
		}).compile();

		const provider = moduleRef.get(Bootstrapped);
		expect(provider.ready).toBe(true);
		expect(provider.calls).toEqual(["init", "bootstrap"]);

		await moduleRef.close();
	});

	it("stops the servers created by createTestApp on close", async () => {
		let closed = 0;
		const storage: RateLimitStorage = {
			hit: async () => ({
				allowed: true,
				remaining: 1,
				limit: 1,
				resetAt: Date.now(),
			}),
			close: () => {
				closed += 1;
			},
		};

		const moduleRef = await Test.createTestingModule({
			controllers: [PingController],
		}).compile();

		moduleRef.createTestApp({ rateLimitStorage: storage });
		moduleRef.createTestApp({ rateLimitStorage: storage });
		expect(closed).toBe(0);

		await moduleRef.close();
		expect(closed).toBe(2);
	});
});
