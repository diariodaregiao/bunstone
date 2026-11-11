import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = join(import.meta.dir, "fixtures", "print-config.ts");

/**
 * Bun loads `.env` files from the directory the process starts in, before any
 * code runs, so this spawns a fresh `bun` with a scratch cwd and a clean
 * environment (the test runner itself sets `NODE_ENV=test`).
 */
function run(cwd: string, env: Record<string, string> = {}) {
	const proc = Bun.spawnSync(["bun", fixture], {
		cwd,
		env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = proc.stdout.toString();
	const line = output.split("\n").find((l) => l.startsWith("CONFIG "));
	if (!line) throw new Error(output + proc.stderr.toString());
	return JSON.parse(line.slice("CONFIG ".length)) as Record<string, unknown>;
}

describe(".env files loaded by Bun", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "bunstone-config-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const write = (file: string, content: string) =>
		writeFile(join(dir, file), content);

	it("reads .env and coerces its values", async () => {
		await write(".env", "SOURCE=dotenv\nPORT=8080\n");
		expect(run(dir)).toEqual({ SOURCE: "dotenv", LOCAL: "unset", PORT: 8080 });
	});

	it("lets .env.<NODE_ENV> override .env, and .env.local override both", async () => {
		await write(".env", "SOURCE=dotenv\nLOCAL=dotenv\n");
		await write(".env.production", "SOURCE=production\n");
		await write(".env.local", "LOCAL=local\n");
		expect(run(dir, { NODE_ENV: "production" })).toMatchObject({
			SOURCE: "production",
			LOCAL: "local",
		});
	});

	it("skips .env.local when NODE_ENV=test", async () => {
		await write(".env", "LOCAL=dotenv\n");
		await write(".env.local", "LOCAL=local\n");
		await write(".env.test", "SOURCE=test\n");
		expect(run(dir, { NODE_ENV: "test" })).toMatchObject({
			SOURCE: "test",
			LOCAL: "dotenv",
		});
	});

	it("never overrides a variable set in the process environment", async () => {
		await write(".env", "SOURCE=dotenv\n");
		await write(".env.local", "SOURCE=local\n");
		expect(run(dir, { SOURCE: "shell" })).toMatchObject({ SOURCE: "shell" });
	});
});
