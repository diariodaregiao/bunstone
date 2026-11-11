import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { ConfigurationError } from "@/errors";
import {
	DEFAULT_IDLE_TIMEOUT_MS,
	resolveIdleTimeout,
} from "@/http/idle-timeout";
import { Body } from "@/http/params";
import { Controller, Get, Post } from "@/http/routing";

@Controller()
class PingController {
	@Get()
	ping() {
		return { ok: true };
	}
}

@Controller("slow")
class SlowController {
	@Get()
	async slowGet() {
		await Bun.sleep(6_000);
		return { ok: true };
	}

	@Post()
	async slowPost(@Body() body: unknown) {
		await Bun.sleep(6_000);
		return { ok: true, body };
	}
}

@Module({ controllers: [PingController, SlowController] })
class AppModule {}

const createOptions = {
	gracefulShutdown: false,
	logStartup: false,
	health: false,
};

type ServeOptions = Parameters<typeof Bun.serve>[0];

describe("resolveIdleTimeout", () => {
	it("defaults to 10000 when omitted", () => {
		expect(resolveIdleTimeout()).toBe(DEFAULT_IDLE_TIMEOUT_MS);
	});

	it("returns the value when valid", () => {
		expect(resolveIdleTimeout(42_000)).toBe(42_000);
	});
});

describe("Application idleTimeout", () => {
	const originalServe = Bun.serve;
	let serveCalls: ServeOptions[] = [];
	let lastServer: ReturnType<typeof Bun.serve> | undefined;
	const apps: Application[] = [];

	beforeEach(() => {
		serveCalls = [];
		Bun.serve = ((options: ServeOptions) => {
			serveCalls.push(options);
			lastServer = originalServe(options);
			return lastServer;
		}) as typeof Bun.serve;
	});

	afterEach(async () => {
		Bun.serve = originalServe;
		for (const app of apps.splice(0)) {
			await app.close();
		}
	});

	it("uses 10000ms by default when idleTimeout is omitted", async () => {
		const app = await Application.create(AppModule, createOptions);
		apps.push(app);
		app.listen(0);
		expect(serveCalls.at(-1)?.idleTimeout).toBe(10);
	});

	it("passes a custom idleTimeout to Bun.serve", async () => {
		const app = await Application.create(AppModule, {
			...createOptions,
			idleTimeout: 25_000,
		});
		apps.push(app);
		app.listen(0);
		expect(serveCalls.at(-1)?.idleTimeout).toBe(25);
	});

	it("rejects non-integer idleTimeout at create time", async () => {
		await expect(
			Application.create(AppModule, {
				...createOptions,
				idleTimeout: 12.5,
			}),
		).rejects.toThrow(ConfigurationError);
	});

	it("rejects zero and negative idleTimeout at create time", async () => {
		await expect(
			Application.create(AppModule, {
				...createOptions,
				idleTimeout: 0,
			}),
		).rejects.toThrow(ConfigurationError);

		await expect(
			Application.create(AppModule, {
				...createOptions,
				idleTimeout: -1,
			}),
		).rejects.toThrow(ConfigurationError);
	});

	it("rejects non-numeric idleTimeout at create time", async () => {
		await expect(
			Application.create(AppModule, {
				...createOptions,
				idleTimeout: "abc" as unknown as number,
			}),
		).rejects.toThrow(ConfigurationError);
	});

	it("closes an idle GET connection once idleTimeout elapses", async () => {
		const app = await Application.create(AppModule, {
			...createOptions,
			idleTimeout: 2_000,
		});
		apps.push(app);
		app.listen(0);
		const port = lastServer?.port;
		await expect(fetch(`http://localhost:${port}/slow`)).rejects.toThrow(
			/ECONNRESET|closed/,
		);
	}, 15_000);

	it("also enforces idleTimeout on a POST that carries a body", async () => {
		const app = await Application.create(AppModule, {
			...createOptions,
			idleTimeout: 2_000,
		});
		apps.push(app);
		app.listen(0);
		const port = lastServer?.port;
		await expect(
			fetch(`http://localhost:${port}/slow`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ a: 1 }),
			}),
		).rejects.toThrow(/ECONNRESET|closed/);
	}, 15_000);
});
