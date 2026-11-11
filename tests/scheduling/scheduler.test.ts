import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { Cron, Interval, Timeout } from "@/scheduling/decorators";
import { Scheduler } from "@/scheduling/scheduler";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Scheduler", () => {
	it("runs @Interval jobs and stops them on shutdown", async () => {
		@Injectable()
		class Ticker {
			ticks = 0;
			@Interval(20)
			tick() {
				this.ticks++;
			}
		}

		@Module({ providers: [Ticker] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const ticker = app.resolve(Ticker);

		await sleep(70);
		expect(ticker.ticks).toBeGreaterThanOrEqual(2);

		await app.close();
		const afterClose = ticker.ticks;
		await sleep(60);
		expect(ticker.ticks).toBe(afterClose);
	});

	it("runs a @Timeout job exactly once", async () => {
		@Injectable()
		class Once {
			runs = 0;
			@Timeout(20)
			run() {
				this.runs++;
			}
		}

		@Module({ providers: [Once] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const once = app.resolve(Once);

		await sleep(60);
		expect(once.runs).toBe(1);
		await app.close();
	});

	it("does not overlap a slow job with itself", async () => {
		@Injectable()
		class Slow {
			started = 0;
			finished = 0;
			@Interval(10)
			async work() {
				this.started++;
				await sleep(50);
				this.finished++;
			}
		}

		@Module({ providers: [Slow] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const slow = app.resolve(Slow);

		await sleep(120);
		await app.close();
		expect(slow.started - slow.finished).toBeLessThanOrEqual(1);
		expect(slow.started).toBeLessThan(6);
	});

	it("isolates a throwing job from the others", async () => {
		@Injectable()
		class Mixed {
			good = 0;
			@Interval(20)
			boom() {
				throw new Error("boom");
			}
			@Interval(20)
			ok() {
				this.good++;
			}
		}

		@Module({ providers: [Mixed] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const mixed = app.resolve(Mixed);

		const originalLog = console.log;
		console.log = () => {};
		await sleep(70);
		await app.close();
		console.log = originalLog;
		expect(mixed.good).toBeGreaterThanOrEqual(2);
	});

	it("throws on an invalid cron expression", () => {
		@Injectable()
		class Bad {
			@Cron("not a cron")
			job() {}
		}

		const scheduler = new Scheduler();
		expect(() => scheduler.start([new Bad()])).toThrow(/cron/i);
	});

	it("accepts a valid cron expression without firing immediately", () => {
		@Injectable()
		class Daily {
			runs = 0;
			@Cron("0 0 * * *")
			job() {
				this.runs++;
			}
		}

		const scheduler = new Scheduler();
		const daily = new Daily();
		expect(() => scheduler.start([daily])).not.toThrow();
		expect(daily.runs).toBe(0);
		scheduler.stopAll();
	});

	it("reads cron expressions in UTC by default, whatever the server zone", () => {
		const calls: unknown[] = [];
		const original = Bun.cron;
		const fake = Object.assign(
			(expression: string, handler: () => unknown, options?: unknown) => {
				calls.push(options);
				return original(expression, handler, options as { tz?: string });
			},
			original,
		);
		(Bun as { cron: typeof Bun.cron }).cron = fake as typeof Bun.cron;
		try {
			@Injectable()
			class Jobs {
				@Cron("0 9 * * *")
				utc() {}
				@Cron("0 9 * * *", { tz: "America/Sao_Paulo" })
				local() {}
			}
			const scheduler = new Scheduler();
			scheduler.start([new Jobs()]);
			scheduler.stopAll();
			expect(calls).toEqual([{ tz: "UTC" }, { tz: "America/Sao_Paulo" }]);
		} finally {
			(Bun as { cron: typeof Bun.cron }).cron = original;
		}
	});

	it("rejects an unknown time zone at startup", () => {
		@Injectable()
		class BadZone {
			@Cron("0 9 * * *", { tz: "Nowhere/Nothing" })
			job() {}
		}
		const scheduler = new Scheduler();
		expect(() => scheduler.start([new BadZone()])).toThrow(/Nowhere\/Nothing/);
	});
});
