import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Container } from "@/core/container";
import { Inject, Injectable, InjectionToken } from "@/core/injectable";

describe("Container", () => {
	it("constructs a class and injects its dependencies", () => {
		@Injectable()
		class Engine {
			start() {
				return "vroom";
			}
		}

		@Injectable()
		class Car {
			constructor(readonly engine: Engine) {}
		}

		const c = new Container();
		c.register(Engine);
		c.register(Car);

		const car = c.resolve(Car);
		expect(car).toBeInstanceOf(Car);
		expect(car.engine).toBeInstanceOf(Engine);
		expect(car.engine.start()).toBe("vroom");
	});

	it("returns the same singleton on repeated resolves", () => {
		@Injectable()
		class Service {}

		const c = new Container();
		c.register(Service);

		expect(c.resolve(Service)).toBe(c.resolve(Service));
	});

	it("shares a dependency instance across consumers", () => {
		@Injectable()
		class Shared {}

		@Injectable()
		class A {
			constructor(readonly shared: Shared) {}
		}

		@Injectable()
		class B {
			constructor(readonly shared: Shared) {}
		}

		const c = new Container();
		c.register(Shared);
		c.register(A);
		c.register(B);

		expect(c.resolve(A).shared).toBe(c.resolve(B).shared);
	});

	it("resolves values and factories by InjectionToken", () => {
		interface Mailer {
			send(): string;
		}
		const MAILER = new InjectionToken<Mailer>("Mailer");
		const CONFIG = new InjectionToken<{ from: string }>("Config");

		@Injectable()
		class Notifier {
			constructor(@Inject(MAILER) readonly mailer: Mailer) {}
		}

		const c = new Container();
		c.register({ provide: CONFIG, useValue: { from: "a@b.com" } });
		c.register({
			provide: MAILER,
			useFactory: (config: { from: string }) => ({
				send: () => `from ${config.from}`,
			}),
			inject: [CONFIG],
		});
		c.register(Notifier);

		expect(c.resolve(Notifier).mailer.send()).toBe("from a@b.com");
	});

	it("throws a clear error on circular dependencies", () => {
		const A = new InjectionToken("A");
		const B = new InjectionToken("B");

		const c = new Container();
		c.register({ provide: A, useFactory: (b) => ({ b }), inject: [B] });
		c.register({ provide: B, useFactory: (a) => ({ a }), inject: [A] });

		expect(() => c.resolve(A)).toThrow(/Circular dependency/);
	});

	it("throws when a token has no provider", () => {
		@Injectable()
		class Orphan {}

		const c = new Container();
		expect(() => c.resolve(Orphan)).toThrow(/No provider registered/);
	});

	it("keeps two containers fully isolated", () => {
		@Injectable()
		class Counter {
			value = 0;
		}

		const a = new Container();
		const b = new Container();
		a.register(Counter);
		b.register(Counter);

		a.resolve(Counter).value = 42;
		expect(b.resolve(Counter).value).toBe(0);
	});

	it("registerValue caches the given instance", () => {
		const TOKEN = new InjectionToken<{ n: number }>("num");
		const c = new Container();
		const value = { n: 1 };
		c.registerValue(TOKEN, value);
		expect(c.resolve(TOKEN)).toBe(value);
	});
});
