import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { RedisClient } from "bun";
import { CacheService } from "@/cache/cache.service";
import { CacheModule } from "@/cache/cache-module";
import { Application } from "@/core/application";
import { Module } from "@/core/module";

const URL = process.env.REDIS_URL ?? "redis://localhost:6379";

async function redisReachable(): Promise<boolean> {
	try {
		const client = new RedisClient(URL);
		await client.set("bunstone:probe", "1");
		await client.del("bunstone:probe");
		client.close();
		return true;
	} catch {
		return false;
	}
}

const reachable = await redisReachable();
const prefix = `bunstone:test:${crypto.randomUUID().slice(0, 8)}`;

@Module({ imports: [CacheModule.register({ url: URL })] })
class AppModule {}

let app: Application;
let cache: CacheService;

beforeAll(async () => {
	if (!reachable) return;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	cache = app.resolve(CacheService);
});

afterAll(async () => {
	if (!reachable) return;
	await cache.delete(`${prefix}:user`);
	await cache.delete(`${prefix}:counter`);
	await app.close();
});

describe.skipIf(!reachable)("CacheService (Bun native Redis)", () => {
	it("stores and reads typed values", async () => {
		await cache.set(`${prefix}:user`, { id: 1, name: "ada" });
		expect(
			await cache.get<{ id: number; name: string }>(`${prefix}:user`),
		).toEqual({ id: 1, name: "ada" });
	});

	it("returns null for a missing key", async () => {
		expect(await cache.get(`${prefix}:missing`)).toBeNull();
	});

	it("reports existence and deletes", async () => {
		await cache.set(`${prefix}:user`, { id: 1 });
		expect(await cache.has(`${prefix}:user`)).toBe(true);
		await cache.delete(`${prefix}:user`);
		expect(await cache.has(`${prefix}:user`)).toBe(false);
	});

	it("computes and caches with getOrSet", async () => {
		let calls = 0;
		const factory = () => {
			calls++;
			return { value: 42 };
		};
		const first = await cache.getOrSet(`${prefix}:counter`, factory);
		const second = await cache.getOrSet(`${prefix}:counter`, factory);
		expect(first).toEqual({ value: 42 });
		expect(second).toEqual({ value: 42 });
		expect(calls).toBe(1);
	});

	it("expires keys with a TTL", async () => {
		await cache.set(`${prefix}:ttl`, "x", { ttlSeconds: 1 });
		expect(await cache.has(`${prefix}:ttl`)).toBe(true);
		await new Promise((r) => setTimeout(r, 1200));
		expect(await cache.has(`${prefix}:ttl`)).toBe(false);
	});
});
