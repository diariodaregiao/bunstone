import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { JwtService } from "@/auth/jwt.service";
import { JwtModule } from "@/auth/jwt-module";
import { Application } from "@/core/application";
import { Inject, Injectable, InjectionToken } from "@/core/injectable";
import { Module } from "@/core/module";

@Injectable()
class InternalHelper {
	value() {
		return "internal";
	}
}

@Injectable()
class PublicService {
	constructor(private readonly helper: InternalHelper) {}
	value() {
		return this.helper.value();
	}
}

@Module({
	providers: [InternalHelper, PublicService],
	exports: [PublicService],
})
class FeatureModule {}

const strict = { gracefulShutdown: false, logStartup: false } as const;

describe("strict module boundaries", () => {
	it("allows an importer to resolve an exported provider", async () => {
		@Injectable()
		class Consumer {
			constructor(readonly feature: PublicService) {}
		}

		@Module({ imports: [FeatureModule], providers: [Consumer] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			...strict,
			strictModuleBoundaries: true,
		});

		expect(app.resolve(Consumer).feature.value()).toBe("internal");
		await app.close();
	});

	it("rejects reaching past a module's exports", async () => {
		@Injectable()
		class Sneaky {
			constructor(readonly helper: InternalHelper) {}
		}

		@Module({ imports: [FeatureModule], providers: [Sneaky] })
		class AppModule {}

		await expect(
			Application.create(AppModule, {
				...strict,
				strictModuleBoundaries: true,
			}),
		).rejects.toThrow(/cannot resolve `InternalHelper`/);
	});

	it("rejects resolving from a module that was never imported", async () => {
		@Injectable()
		class Detached {
			constructor(readonly feature: PublicService) {}
		}

		@Module({ providers: [Detached] })
		class Isolated {}

		@Module({ imports: [FeatureModule, Isolated] })
		class AppModule {}

		await expect(
			Application.create(AppModule, {
				...strict,
				strictModuleBoundaries: true,
			}),
		).rejects.toThrow(/cannot resolve `PublicService`/);
	});

	it("keeps global modules reachable without an explicit import", async () => {
		@Injectable()
		class NeedsJwt {
			constructor(readonly jwt: JwtService) {}
		}

		@Module({
			imports: [JwtModule.register({ secret: "s3cret" })],
			providers: [NeedsJwt],
		})
		class AppModule {}

		const app = await Application.create(AppModule, {
			...strict,
			strictModuleBoundaries: true,
		});

		expect(app.resolve(NeedsJwt).jwt).toBeInstanceOf(JwtService);
		await app.close();
	});

	it("supports re-exporting a token from an imported module", async () => {
		const TOKEN = new InjectionToken<string>("Shared");

		@Module({
			providers: [{ provide: TOKEN, useValue: "shared" }],
			exports: [TOKEN],
		})
		class Inner {}

		@Module({ imports: [Inner], exports: [TOKEN] })
		class Middle {}

		@Injectable()
		class Consumer {
			constructor(@Inject(TOKEN) readonly shared: string) {}
		}

		@Module({ imports: [Middle], providers: [Consumer] })
		class AppModule {}

		const app = await Application.create(AppModule, {
			...strict,
			strictModuleBoundaries: true,
		});

		expect(app.resolve(Consumer).shared).toBe("shared");
		await app.close();
	});

	it("stays permissive when the option is off", async () => {
		@Injectable()
		class Sneaky {
			constructor(readonly helper: InternalHelper) {}
		}

		@Module({ imports: [FeatureModule], providers: [Sneaky] })
		class AppModule {}

		const app = await Application.create(AppModule, strict);

		expect(app.resolve(Sneaky).helper.value()).toBe("internal");
		await app.close();
	});
});
