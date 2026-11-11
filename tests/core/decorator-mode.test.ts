import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { ConfigurationError } from "@/errors";
import { Controller, Get } from "@/http/routing";

const fixture = join(import.meta.dir, "fixtures", "decorator-mode-app.ts");
const repo = join(import.meta.dir, "..", "..");

/** Runs the fixture app with `cwd` as the directory the process starts in. */
function runFrom(cwd: string): string {
	const proc = Bun.spawnSync(["bun", fixture], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	return proc.stdout.toString() + proc.stderr.toString();
}

describe("decorator mode at boot", () => {
	let noTsconfig: string;
	let noMetadata: string;

	beforeAll(async () => {
		noTsconfig = await mkdtemp(join(tmpdir(), "bunstone-no-tsconfig-"));
		noMetadata = await mkdtemp(join(tmpdir(), "bunstone-no-metadata-"));
		await writeFile(
			join(noMetadata, "tsconfig.json"),
			JSON.stringify({ compilerOptions: { experimentalDecorators: true } }),
		);
	});

	afterAll(async () => {
		await rm(noTsconfig, { recursive: true, force: true });
		await rm(noMetadata, { recursive: true, force: true });
	});

	it("works when started from the project directory", () => {
		expect(runFrom(repo)).toContain('STATUS 200 {"text":"hi 7"}');
	});

	it("names the cause when Bun compiled standard decorators", () => {
		const output = runFrom(noTsconfig);
		expect(output).toContain("BNS-CFG-005");
		expect(output).toContain("standard (TC39) decorator");
		expect(output).toContain(noTsconfig);
		expect(output).not.toContain("STATUS");
	});

	it("points at emitDecoratorMetadata, not @Injectable, when types are missing", () => {
		const output = runFrom(noMetadata);
		expect(output).toContain("BNS-DI-003");
		expect(output).toContain('"emitDecoratorMetadata": true');
		expect(output).not.toContain("Ensure all providers are decorated");
	});
});

describe("assertLegacyDecorator", () => {
	/** What a standard (TC39) decorator receives as its second argument. */
	const classContext = { kind: "class", name: "X", metadata: {} };
	const methodContext = { kind: "method", name: "m", static: false };

	it("rejects the standard calling convention with a clear error", () => {
		class X {}
		const calls: [string, () => unknown][] = [
			["@Module()", () => (Module() as Function)(X, classContext)],
			["@Injectable()", () => (Injectable() as Function)(X, classContext)],
			["@Controller()", () => (Controller() as Function)(X, classContext)],
			["@Get()", () => (Get() as Function)(() => {}, methodContext)],
		];
		for (const [name, call] of calls) {
			let error: unknown;
			try {
				call();
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(ConfigurationError);
			expect((error as ConfigurationError).code).toBe("BNS-CFG-005");
			expect((error as Error).message).toContain(name);
		}
	});

	it("leaves legacy decorators alone", () => {
		@Module({})
		@Injectable()
		@Controller("ok")
		class Fine {
			@Get()
			handler() {}
		}
		expect(Reflect.getMetadata("bunstone:controller", Fine)).toBe("/ok");
	});
});
