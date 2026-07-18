import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import type {
	OnApplicationBootstrap,
	OnModuleDestroy,
	OnModuleInit,
} from "@/core/lifecycle";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";

describe("Application lifecycle", () => {
	it("runs init, bootstrap and destroy hooks in order", async () => {
		const events: string[] = [];

		@Injectable()
		class Service
			implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
		{
			async onModuleInit() {
				events.push("init");
			}
			onApplicationBootstrap() {
				events.push("bootstrap");
			}
			async onModuleDestroy() {
				events.push("destroy");
			}
		}

		@Module({ providers: [Service] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		expect(events).toEqual(["init", "bootstrap"]);

		await app.close();
		expect(events).toEqual(["init", "bootstrap", "destroy"]);
	});

	it("close() is idempotent", async () => {
		let destroys = 0;

		@Injectable()
		class Service implements OnModuleDestroy {
			onModuleDestroy() {
				destroys++;
			}
		}

		@Module({ providers: [Service] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		await app.close();
		await app.close();
		expect(destroys).toBe(1);
	});

	it("stops accepting requests after close()", async () => {
		@Controller()
		class PingController {
			@Get()
			ping() {
				return { ok: true };
			}
		}

		@Module({ controllers: [PingController] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		app.listen(0);
		const base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";

		expect((await fetch(base)).status).toBe(200);
		await app.close();
		expect(app.getServer()).toBeUndefined();
	});

	it("keeps two apps isolated in the same process", async () => {
		@Injectable()
		class Counter {
			value = 0;
		}

		@Module({ providers: [Counter] })
		class AppModule {}

		const a = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const b = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});

		a.resolve(Counter).value = 99;
		expect(b.resolve(Counter).value).toBe(0);

		await a.close();
		await b.close();
	});
});
