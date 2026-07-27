import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";
import { RateLimit } from "@/ratelimit/decorator";

@Controller("api")
class ApiController {
	@Get("limited")
	@RateLimit({ max: 2, windowMs: 60_000 })
	limited() {
		return { ok: true };
	}
}

@Module({ controllers: [ApiController] })
class AppModule {}

async function start(trustProxy?: boolean | number) {
	const app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
		trustProxy,
	});
	app.listen(0);
	return {
		app,
		base: app.getServer()?.url.href.replace(/\/$/, "") ?? "",
	};
}

/** Every request comes from the same peer, as it would behind a proxy. */
function hit(base: string, forwardedFor?: string) {
	return fetch(`${base}/api/limited`, {
		headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
	});
}

describe("trustProxy off", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		({ app, base } = await start());
	});

	afterAll(async () => {
		await app.close();
	});

	it("ignores the forwarding chain and buckets by peer address", async () => {
		const statuses = [
			(await hit(base, "1.1.1.1")).status,
			(await hit(base, "2.2.2.2")).status,
			(await hit(base, "3.3.3.3")).status,
		];

		expect(statuses).toEqual([200, 200, 429]);
	});
});

describe("trustProxy on", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		({ app, base } = await start(true));
	});

	afterAll(async () => {
		await app.close();
	});

	it("gives each forwarded client its own bucket", async () => {
		const statuses = [
			(await hit(base, "1.1.1.1")).status,
			(await hit(base, "2.2.2.2")).status,
			(await hit(base, "3.3.3.3")).status,
		];

		expect(statuses).toEqual([200, 200, 200]);
	});

	it("still limits a single forwarded client", async () => {
		const statuses: number[] = [];
		for (let i = 0; i < 3; i++) {
			statuses.push((await hit(base, "9.9.9.9")).status);
		}

		expect(statuses).toEqual([200, 200, 429]);
	});

	it("reads the entry the trusted proxy appended, not the client's", async () => {
		// a client prepending its own entries only pushes its real address left
		const first = await hit(base, "spoofed, 8.8.8.8");
		const second = await hit(base, "other-spoof, 8.8.8.8");
		const third = await hit(base, "8.8.8.8");

		expect([first.status, second.status, third.status]).toEqual([
			200, 200, 429,
		]);
	});

	it("falls back to the peer address when no chain was forwarded", async () => {
		// the peer bucket was exhausted by the direct requests above
		const statuses = [(await hit(base)).status, (await hit(base)).status];

		expect(statuses).toEqual([200, 200]);
	});
});

describe("trustProxy with two hops", () => {
	let app: Application;
	let base: string;

	beforeAll(async () => {
		({ app, base } = await start(2));
	});

	afterAll(async () => {
		await app.close();
	});

	it("skips both proxies to reach the client", async () => {
		const statuses = [
			(await hit(base, "5.5.5.5, cdn.example")).status,
			(await hit(base, "5.5.5.5, other-cdn")).status,
			(await hit(base, "5.5.5.5, cdn.example")).status,
		];

		expect(statuses).toEqual([200, 200, 429]);
	});

	it("ignores a chain too short to have crossed both proxies", async () => {
		// one entry cannot have come through two proxies, so it is not trusted
		const first = await hit(base, "7.7.7.7");
		const second = await hit(base, "8.8.8.8");

		// both fall back to the shared peer bucket
		expect([first.status, second.status]).toEqual([200, 200]);
		expect((await hit(base, "6.6.6.6")).status).toBe(429);
	});
});
