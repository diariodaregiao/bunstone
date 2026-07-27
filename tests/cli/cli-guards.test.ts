import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generate, isGenerateKind } from "@/cli/generate";

const CLI = resolve(import.meta.dir, "../../bin/cli.ts");

interface RunResult {
	code: number;
	stdout: string;
	stderr: string;
}

async function runCli(args: string[], cwd: string): Promise<RunResult> {
	const proc = Bun.spawn(["bun", CLI, ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	return { code: await proc.exited, stdout, stderr };
}

describe("generate kind validation", () => {
	it("recognises only the supported kinds", () => {
		expect(isGenerateKind("controller")).toBe(true);
		expect(isGenerateKind("service")).toBe(true);
		expect(isGenerateKind("module")).toBe(true);
		expect(isGenerateKind("controler")).toBe(false);
		expect(isGenerateKind(undefined)).toBe(false);
	});

	it("throws instead of returning undefined for an unknown kind", () => {
		expect(() =>
			// deliberately bypassing the type to reproduce unvalidated argv
			generate("controler" as never, "users"),
		).toThrow(/Unknown generate kind/);
	});
});

describe("cli file-overwrite guards", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "bunstone-cli-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("refuses to scaffold into a non-empty directory", async () => {
		const project = join(dir, "app");
		await Bun.write(join(project, "package.json"), '{"name":"mine"}');
		await Bun.write(join(project, "src/main.ts"), "// mine\n");

		const result = await runCli(["new", "app"], dir);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Refusing to scaffold");
		expect(await Bun.file(join(project, "package.json")).text()).toBe(
			'{"name":"mine"}',
		);
		expect(await Bun.file(join(project, "src/main.ts")).text()).toBe(
			"// mine\n",
		);
	});

	it("scaffolds into an empty directory", async () => {
		const result = await runCli(["new", "fresh"], dir);

		expect(result.code).toBe(0);
		expect(await Bun.file(join(dir, "fresh/src/main.ts")).exists()).toBe(true);
	});

	it("overwrites a non-empty directory with --force", async () => {
		const project = join(dir, "app");
		await Bun.write(join(project, "package.json"), '{"name":"mine"}');

		const result = await runCli(["new", "app", "--force"], dir);

		expect(result.code).toBe(0);
		expect(await Bun.file(join(project, "package.json")).text()).toContain(
			'"name": "app"',
		);
	});

	it("refuses to overwrite an existing generated file", async () => {
		await Bun.write(join(dir, "users.controller.ts"), "// mine\n");

		const result = await runCli(["g", "controller", "users"], dir);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("Refusing to overwrite");
		expect(await Bun.file(join(dir, "users.controller.ts")).text()).toBe(
			"// mine\n",
		);
	});

	it("overwrites an existing generated file with --force", async () => {
		await Bun.write(join(dir, "users.controller.ts"), "// mine\n");

		const result = await runCli(["g", "controller", "users", "--force"], dir);

		expect(result.code).toBe(0);
		expect(await Bun.file(join(dir, "users.controller.ts")).text()).toContain(
			"export class UsersController",
		);
	});

	it("prints usage instead of crashing on an invalid kind", async () => {
		const result = await runCli(["g", "controler", "users"], dir);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(
			"Usage: bunstone generate <controller|service|module> <name>",
		);
		expect(result.stderr).not.toContain("TypeError");
	});
});
