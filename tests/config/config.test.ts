import "reflect-metadata";
import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { CONFIG } from "@/config/config.tokens";
import { ConfigModule } from "@/config/config-module";
import { defineConfig, type InferConfig } from "@/config/define-config";
import { Application } from "@/core/application";
import { Inject, Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { SqlService } from "@/database/sql.service";
import { SqlModule } from "@/database/sql-module";
import { ConfigurationError } from "@/errors";
import { Test } from "@/testing/testing-module";

const Env = z.object({
	DATABASE_URL: z.url(),
	PORT: z.coerce.number().int().default(3000),
	DEBUG: z.stringbool().default(false),
	NODE_ENV: z.enum(["development", "production", "test"]),
	JWT_SECRET: z.string().min(32),
	SENTRY_DSN: z.url().optional(),
});

type AppConfig = InferConfig<typeof Env>;

const valid = {
	DATABASE_URL: "postgres://user:pass@localhost:5432/app",
	NODE_ENV: "production",
	JWT_SECRET: "x".repeat(32),
};

function failure(run: () => unknown): ConfigurationError {
	try {
		run();
	} catch (error) {
		if (error instanceof ConfigurationError) return error;
		throw error;
	}
	throw new Error("expected a ConfigurationError");
}

describe("defineConfig", () => {
	it("parses, coerces and applies defaults", () => {
		const config = defineConfig(Env, {
			env: { ...valid, PORT: "8080", DEBUG: "false" },
		});
		expect(config).toEqual({
			DATABASE_URL: valid.DATABASE_URL,
			PORT: 8080,
			DEBUG: false,
			NODE_ENV: "production",
			JWT_SECRET: valid.JWT_SECRET,
		});
		const port: number = config.PORT;
		// @ts-expect-error typed, not `any`: PORT is a number
		const notAString: string = config.PORT;
		expect(typeof notAString).toBe("number");
		const env: "development" | "production" | "test" = config.NODE_ENV;
		const dsn: string | undefined = config.SENTRY_DSN;
		expect([port, env, dsn]).toEqual([8080, "production", undefined]);

		const defaults = defineConfig(Env, { env: valid });
		expect(defaults.PORT).toBe(3000);
		expect(defaults.DEBUG).toBe(false);
	});

	it("keeps only the declared variables", () => {
		const config = defineConfig(Env, { env: { ...valid, OTHER: "1" } });
		expect("OTHER" in config).toBe(false);
	});

	it("reads Bun.env when no source is given, at call time", () => {
		Bun.env.BUNSTONE_CONFIG_PROBE = "from-bun-env";
		try {
			const config = defineConfig(
				z.object({ BUNSTONE_CONFIG_PROBE: z.string() }),
			);
			expect(config.BUNSTONE_CONFIG_PROBE).toBe("from-bun-env");
		} finally {
			delete Bun.env.BUNSTONE_CONFIG_PROBE;
		}
	});

	it("returns a deeply frozen value", () => {
		const config = defineConfig(
			z.object({
				HOSTS: z.string().transform((value) => ({ list: value.split(",") })),
			}),
			{ env: { HOSTS: "a,b" } },
		);
		expect(Object.isFrozen(config)).toBe(true);
		expect(Object.isFrozen(config.HOSTS)).toBe(true);
		expect(Object.isFrozen(config.HOSTS.list)).toBe(true);
		expect(() => {
			(config as { HOSTS: unknown }).HOSTS = null;
		}).toThrow(TypeError);
		expect(() => {
			// @ts-expect-error the type is readonly, too
			config.HOSTS.list.push("c");
		}).toThrow(TypeError);
	});

	it("reports every invalid or missing variable in one error", () => {
		const error = failure(() =>
			defineConfig(Env, {
				env: { PORT: "eighty", NODE_ENV: "staging", JWT_SECRET: "short" },
			}),
		);
		expect(error.code).toBe("BNS-CFG-006");
		expect(error.summary).toBe(
			"Invalid configuration: 4 environment variables failed validation.",
		);
		expect(error.context).toEqual({
			variables: ["DATABASE_URL", "PORT", "NODE_ENV", "JWT_SECRET"],
		});
		expect(error.message).toContain("- DATABASE_URL: missing");
		expect(error.message).toContain("- PORT: Invalid input: expected number");
		expect(error.message).toContain(
			'- NODE_ENV: Invalid option: expected one of "development"|"production"|"test"',
		);
		expect(error.message).toContain(
			"- JWT_SECRET: Too small: expected string to have >=32 characters",
		);
	});

	it("never prints the values it rejects", () => {
		const secret = "sk_live_DO_NOT_LEAK_4242";
		const Leaky = z.object({
			API_KEY: z.string().refine((value) => value.startsWith("pk_"), {
				error: (issue) => `"${issue.input}" is not a public key`,
			}),
			MODE: z.enum(["a", "b"]),
		});
		const error = failure(() =>
			defineConfig(Leaky, { env: { API_KEY: secret, MODE: secret } }),
		);
		const printed = [
			error.message,
			error.summary,
			error.suggestion,
			JSON.stringify(error.context),
			String(error.cause),
		].join("\n");
		expect(printed).not.toContain(secret);
		expect(printed).toContain("API_KEY");
		expect(printed).toContain('"[redacted]" is not a public key');
	});

	it("rejects a schema that only validates asynchronously", () => {
		const Async = z.object({
			TOKEN: z.string().refine(async () => true),
		});
		const error = failure(() => defineConfig(Async, { env: { TOKEN: "abc" } }));
		expect(error.code).toBe("BNS-CFG-006");
		expect(error.message).toContain("asynchronous");
	});
});

describe("ConfigModule", () => {
	const config = defineConfig(Env, { env: { ...valid, PORT: "4000" } });

	@Injectable()
	class Server {
		constructor(@Inject(CONFIG) readonly config: AppConfig) {}
	}

	@Module({
		imports: [ConfigModule.register(config)],
		providers: [Server],
	})
	class AppModule {}

	let app: Application | undefined;
	afterEach(async () => {
		await app?.close();
		app = undefined;
	});

	it("injects the same frozen config everywhere", async () => {
		@Injectable()
		class Elsewhere {
			constructor(@Inject(CONFIG) readonly config: AppConfig) {}
		}
		@Module({ providers: [Elsewhere], exports: [Elsewhere] })
		class FeatureModule {}
		@Module({ imports: [ConfigModule.register(config), FeatureModule] })
		class Root {}

		app = await Application.create(Root, {
			gracefulShutdown: false,
			logStartup: false,
			strictModuleBoundaries: true,
		});
		const injected = app.resolve(Elsewhere).config;
		expect(injected).toBe(config);
		expect(injected.PORT).toBe(4000);
	});

	it("can be overridden in a testing module", async () => {
		const testConfig = defineConfig(Env, {
			env: { ...valid, NODE_ENV: "test", PORT: "0" },
		});
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(CONFIG)
			.useValue(testConfig)
			.compile();
		expect(moduleRef.get(Server).config.NODE_ENV).toBe("test");
		await moduleRef.close();
	});

	it("feeds other modules' register(...) calls", async () => {
		const db = defineConfig(
			z.object({ DATABASE_FILE: z.string().default(":memory:") }),
			{ env: {} },
		);
		@Module({
			imports: [
				ConfigModule.register(db),
				SqlModule.register({ adapter: "sqlite", filename: db.DATABASE_FILE }),
			],
		})
		class Root {}

		app = await Application.create(Root, {
			gracefulShutdown: false,
			logStartup: false,
		});
		const sql = app.resolve(SqlService);
		expect(await sql.queryOne<{ n: number }>("SELECT 1 AS n")).toEqual({
			n: 1,
		});
	});
});
