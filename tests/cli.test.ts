import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { exists, rm } from "node:fs/promises";
import { join } from "node:path";

const testProjectName = "test-scaffold-app";
const projectPath = join(process.cwd(), testProjectName);

test("should scaffold a new project correctly", async () => {
	// Ensure the directory doesn't exist before we start
	if (await exists(projectPath)) {
		await rm(projectPath, { recursive: true, force: true });
	}

	// Run the CLI script
	// We use spawnSync to wait for it to finish the file operations
	const _result = spawnSync(
		"bun",
		["run", "bin/cli.ts", "new", testProjectName],
		{
			encoding: "utf-8",
		},
	);

	// Verify directories and files exist
	expect(await exists(projectPath)).toBe(true);
	expect(await exists(join(projectPath, "package.json"))).toBe(true);
	expect(await exists(join(projectPath, "tsconfig.json"))).toBe(true);
	expect(await exists(join(projectPath, "src"))).toBe(true);
	expect(await exists(join(projectPath, "src/main.ts"))).toBe(true);
	expect(await exists(join(projectPath, "src/app.module.ts"))).toBe(true);
	expect(
		await exists(join(projectPath, "src/controllers/app.controller.ts")),
	).toBe(true);
	expect(await exists(join(projectPath, "src/services/app.service.ts"))).toBe(
		true,
	);
	expect(await exists(join(projectPath, "src/views/Welcome.tsx"))).toBe(true);
	expect(await exists(join(projectPath, ".gitignore"))).toBe(true);

	// Check package.json content
	const pkg = await Bun.file(join(projectPath, "package.json")).json();
	expect(pkg.name).toBe(testProjectName);
}, 30000);

afterAll(async () => {
	// Cleanup
	if (await exists(projectPath)) {
		await rm(projectPath, { recursive: true, force: true });
	}
});
