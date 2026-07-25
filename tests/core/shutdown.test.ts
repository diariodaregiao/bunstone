import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { Cron, Interval } from "@/scheduling/decorators";

describe("shutdown", () => {
	it("runs every destroy hook even when one throws", async () => {
		const order: string[] = [];

		@Injectable()
		class First {
			onModuleDestroy() {
				order.push("first");
			}
		}

		@Injectable()
		class Failing {
			onModuleDestroy(): Promise<void> {
				order.push("failing");
				return Promise.reject(new Error("pool close failed"));
			}
		}

		@Injectable()
		class Last {
			onModuleDestroy() {
				order.push("last");
			}
		}

		@Module({ providers: [First, Failing, Last] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});

		await expect(app.close()).rejects.toThrow(AggregateError);
		expect(order).toHaveLength(3);
	});

	it("stops scheduled jobs even when a destroy hook throws", async () => {
		@Injectable()
		class Ticker {
			ticks = 0;
			@Interval(50)
			tick() {
				this.ticks++;
			}
		}

		@Injectable()
		class Failing {
			onModuleDestroy(): Promise<void> {
				return Promise.reject(new Error("nope"));
			}
		}

		@Module({ providers: [Ticker, Failing] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const ticker = app.resolve(Ticker);

		await app.close().catch(() => undefined);
		const ticksAtClose = ticker.ticks;
		await Bun.sleep(200);

		expect(ticker.ticks).toBe(ticksAtClose);
	});

	it("tears down started resources when bootstrap fails", async () => {
		@Injectable()
		class Ticker {
			ticks = 0;
			@Interval(20)
			tick() {
				this.ticks++;
			}
		}

		@Injectable()
		class BrokenSchedule {
			@Cron("this is not a cron expression")
			job() {}
		}

		@Module({ providers: [Ticker, BrokenSchedule] })
		class AppModule {}

		let created: Application | undefined;
		await expect(
			Application.create(AppModule, {
				gracefulShutdown: false,
				logStartup: false,
			}).then((app) => {
				created = app;
			}),
		).rejects.toThrow();

		expect(created).toBeUndefined();
		// the interval started before the bad cron threw must not survive
		await Bun.sleep(100);
	});
});
