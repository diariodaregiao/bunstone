import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Inject, Injectable, InjectionToken } from "@/core/injectable";
import { compileModules, Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";

const TOKEN = new InjectionToken<string>("Configured");

@Controller("f")
class FeatureController {
	@Get()
	index() {
		return { ok: true };
	}
}

@Module({ controllers: [FeatureController] })
class FeatureModule {
	static register(value: string) {
		return {
			module: FeatureModule,
			providers: [{ provide: TOKEN, useValue: value }],
		};
	}
}

describe("module composition", () => {
	it("applies static metadata once however the module is imported", () => {
		@Module({ imports: [FeatureModule, FeatureModule.register("one")] })
		class ClassFirst {}

		@Module({ imports: [FeatureModule.register("one"), FeatureModule] })
		class DynamicFirst {}

		for (const root of [ClassFirst, DynamicFirst]) {
			const compiled = compileModules(root);
			// registering the controller twice would make the app fail to boot
			expect(compiled.controllers).toEqual([FeatureController]);
			expect(compiled.container.resolve(TOKEN)).toBe("one");
		}
	});

	it("lets the last configuration of a dynamic module win", () => {
		@Module({
			imports: [FeatureModule.register("one"), FeatureModule.register("two")],
		})
		class TwoConfigs {}

		const compiled = compileModules(TwoConfigs);

		expect(compiled.controllers).toEqual([FeatureController]);
		expect(compiled.container.resolve(TOKEN)).toBe("two");
	});

	it("resolves a diamond import graph regardless of import order", async () => {
		const A = new InjectionToken<string>("A");
		const B = new InjectionToken<string>("B");

		@Module({
			providers: [
				{ provide: A, useValue: "a" },
				{ provide: B, useValue: "b" },
			],
			exports: [A, B],
		})
		class Shared {}

		@Module({ imports: [Shared], exports: [A] })
		class Left {}

		@Module({ imports: [Shared], exports: [B] })
		class Right {}

		@Injectable()
		class Consumer {
			constructor(
				@Inject(A) readonly a: string,
				@Inject(B) readonly b: string,
			) {}
		}

		for (const branches of [
			[Left, Right],
			[Right, Left],
		]) {
			@Module({ imports: branches, exports: [A, B] })
			class Aggregate {}

			@Module({ imports: [Aggregate], providers: [Consumer] })
			class AppModule {}

			const app = await Application.create(AppModule, {
				gracefulShutdown: false,
				logStartup: false,
				strictModuleBoundaries: true,
			});

			const consumer = app.resolve(Consumer);
			expect([consumer.a, consumer.b]).toEqual(["a", "b"]);
			await app.close();
		}
	});
});
