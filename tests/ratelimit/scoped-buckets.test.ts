import "reflect-metadata";
import { afterEach, describe, expect, it } from "bun:test";
import type { RedisClient } from "bun";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RATE_LIMIT_STORAGE, RateLimit, RateLimitModule } from "@/ratelimit";
import { RedisStorage } from "@/ratelimit/redis-storage";
import type { RateLimitStorage } from "@/ratelimit/storage";
import { Test } from "@/testing";

const quiet = { gracefulShutdown: false, logStartup: false } as const;

let app: Application | undefined;

afterEach(async () => {
	await app?.close();
	app = undefined;
});

async function start(root: object, options = {}): Promise<string> {
	app = await Application.create(root as never, { ...quiet, ...options });
	app.listen(0);
	return app.getServer()?.url.href.replace(/\/$/, "") ?? "";
}

async function statuses(url: string, times: number): Promise<number[]> {
	const out: number[] = [];
	for (let i = 0; i < times; i++) out.push((await fetch(url)).status);
	return out;
}

describe("global limit is one budget for the whole application", () => {
	@Controller("a")
	class AController {
		@Get("x")
		x() {
			return {};
		}

		@Get("y")
		y() {
			return {};
		}
	}

	@Module({ controllers: [AController] })
	class GlobalRoot {}

	it("counts every route against the same per-client budget", async () => {
		const base = await start(GlobalRoot, {
			rateLimit: { max: 2, windowMs: 60_000 },
		});
		expect(await statuses(`${base}/a/x`, 2)).toEqual([200, 200]);
		expect(await statuses(`${base}/a/y`, 1)).toEqual([429]);
	});

	it("keeps @RateLimit() on a route counted per route", async () => {
		// a per-route limit is independent of the global bucket
		@Controller("r")
		class RouteController {
			@Get("x")
			@RateLimit({ max: 1, windowMs: 60_000 })
			x() {
				return {};
			}
		}

		@Module({ controllers: [RouteController, AController] })
		class MixedRoot {}

		const base = await start(MixedRoot, {
			rateLimit: { max: 5, windowMs: 60_000 },
		});
		expect(await statuses(`${base}/r/x`, 2)).toEqual([200, 429]);
		expect(await statuses(`${base}/a/x`, 5)).toEqual([200, 200, 200, 200, 200]);
	});
});

describe("RateLimitModule subtree over a shared module", () => {
	@Controller("child")
	class ChildController {
		@Get()
		get() {
			return {};
		}
	}

	@Controller("shared")
	class SharedController {
		@Get()
		get() {
			return {};
		}
	}

	@Module({ controllers: [ChildController] })
	class Child {}

	@Module({ imports: [Child], controllers: [SharedController] })
	class Shared {}

	@Module({ imports: [Shared] })
	class Open {}

	@Module({
		imports: [RateLimitModule.register({ max: 1, windowMs: 60_000 }), Shared],
	})
	class Limited {}

	it("limits the whole subtree whatever the import order", async () => {
		for (const imports of [
			[Open, Limited],
			[Limited, Open],
		]) {
			@Module({ imports })
			class Root {}

			const base = await start(Root);
			expect(await statuses(`${base}/shared`, 2)).toEqual([200, 429]);
			// Child sits below Shared, so it shares the same subtree budget
			expect(await statuses(`${base}/child`, 1)).toEqual([429]);
			await app?.close();
			app = undefined;
		}
	});

	it("applies the strictest limit when two subtrees reach one module", async () => {
		@Module({
			imports: [RateLimitModule.register({ max: 5, windowMs: 60_000 }), Shared],
		})
		class Loose {}

		for (const imports of [
			[Loose, Limited],
			[Limited, Loose],
		]) {
			@Module({ imports })
			class Root {}

			const base = await start(Root);
			expect(await statuses(`${base}/shared`, 2)).toEqual([200, 429]);
			await app?.close();
			app = undefined;
		}
	});
});

describe("createTestApp", () => {
	@Controller("m")
	class LimitedController {
		@Get()
		get() {
			return {};
		}
	}

	@Module({
		imports: [RateLimitModule.register({ max: 1, windowMs: 60_000 })],
		controllers: [LimitedController],
	})
	class LimitedModule {}

	it("enforces RateLimitModule.register() like the real application", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [LimitedModule],
		}).compile();
		const testApp = moduleRef.createTestApp();

		const result: number[] = [];
		for (let i = 0; i < 3; i++) result.push((await testApp.get("/m")).status);
		expect(result).toEqual([200, 429, 429]);
		await moduleRef.close();
	});
});

describe("storage ownership", () => {
	@Controller("ping")
	class PingController {
		@Get()
		get() {
			return {};
		}
	}

	it("does not close a storage provided by the container on server stop", async () => {
		let closed = 0;
		const storage: RateLimitStorage = {
			hit: async (_key, max) => ({
				allowed: true,
				limit: max,
				remaining: max,
				resetAt: Date.now() + 1000,
			}),
			close: () => {
				closed += 1;
			},
		};

		@Module({
			providers: [{ provide: RATE_LIMIT_STORAGE, useValue: storage }],
			controllers: [PingController],
		})
		class StorageRoot {}

		const moduleRef = await Test.createTestingModule({
			imports: [StorageRoot],
		}).compile();
		moduleRef.createTestApp({ rateLimit: { max: 5, windowMs: 1000 } });
		moduleRef.createTestApp({ rateLimit: { max: 5, windowMs: 1000 } });
		await moduleRef.close();
		expect(closed).toBe(0);
	});

	it("never closes a Redis client handed to registerStorage()", async () => {
		let closed = 0;
		const client = {
			send: async () => [1, 1000],
			close: () => {
				closed += 1;
			},
		} as unknown as RedisClient;

		@Module({
			imports: [RateLimitModule.registerStorage({ client })],
			controllers: [PingController],
		})
		class ClientRoot {}

		const base = await start(ClientRoot, {
			rateLimit: { max: 5, windowMs: 1000 },
		});
		expect((await fetch(`${base}/ping`)).status).toBe(200);
		await app?.close();
		app = undefined;
		expect(closed).toBe(0);
	});
});

describe("storage failure", () => {
	@Controller("ping")
	class PingController {
		@Get()
		get() {
			return {};
		}
	}

	it("answers 503 when the storage rejects the request", async () => {
		const failing = {
			send: async () => {
				throw new Error("connection refused");
			},
			close: () => {},
		} as unknown as RedisClient;

		@Module({ controllers: [PingController] })
		class FailRoot {}

		const base = await start(FailRoot, {
			rateLimit: { max: 5, windowMs: 1000 },
			rateLimitStorage: new RedisStorage({
				client: failing,
				onFailure: "reject",
			}),
		});
		const res = await fetch(`${base}/ping`);
		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ message: "Service Unavailable" });
	});
});
