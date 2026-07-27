#!/usr/bin/env bun
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { GENERATE_KINDS, generate, isGenerateKind } from "../src/cli/generate";
import { projectAgentsMd } from "../src/cli/scaffold-agents";

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const [command, ...args] = argv.filter((arg) => arg !== "--force");

async function main(): Promise<void> {
	switch (command) {
		case "new":
			await scaffold(args[0]);
			break;
		case "run":
			// forwarded verbatim: flags after `run` belong to Bun, not to us
			await runBun(["run", ...argv.slice(1)]);
			break;
		case "build":
			await buildApp(args[0]);
			break;
		case "generate":
		case "g":
			await runGenerate(args[0], args[1]);
			break;
		case "exports":
			await listExports();
			break;
		default:
			printHelp();
	}
}

async function scaffold(name?: string): Promise<void> {
	if (!name) return fail("Usage: bunstone new <project-name>");
	const root = resolve(name);
	if (!force && !(await isEmptyDir(root))) {
		return fail(
			`Refusing to scaffold into "${name}": the directory is not empty. Re-run with --force to overwrite its files.`,
		);
	}
	const files: Record<string, string> = {
		"package.json": JSON.stringify(
			{
				name,
				type: "module",
				scripts: { dev: "bun run --watch src/main.ts" },
				dependencies: {
					"@grupodiariodaregiao/bunstone": "^1.0.0",
					"reflect-metadata": "^0.2.2",
				},
				devDependencies: {
					"@types/bun": "latest",
					typescript: "^5",
				},
			},
			null,
			2,
		),
		"tsconfig.json": JSON.stringify(
			{
				compilerOptions: {
					lib: ["ESNext"],
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "bundler",
					types: ["bun"],
					experimentalDecorators: true,
					emitDecoratorMetadata: true,
					strict: true,
					skipLibCheck: true,
					noEmit: true,
				},
				include: ["src"],
			},
			null,
			2,
		),
		"AGENTS.md": projectAgentsMd(),
		"CLAUDE.md": "@AGENTS.md\n",
		"src/main.ts": `import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule);
app.listen(3000);
`,
		"src/app.module.ts": `import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./app.controller";

@Module({ controllers: [AppController] })
export class AppModule {}
`,
		"src/app.controller.ts": `import { Controller, Get } from "@grupodiariodaregiao/bunstone";

@Controller()
export class AppController {
	@Get()
	hello() {
		return { message: "Hello from Bunstone!" };
	}
}
`,
	};

	for (const [path, content] of Object.entries(files)) {
		const target = join(root, path);
		await mkdir(dirname(target), { recursive: true });
		await Bun.write(target, content);
	}
	console.log(
		`Created ${name}. Next: cd ${name} && bun install && bun run dev`,
	);
}

/** A missing directory counts as empty — that is the normal `new` case. */
async function isEmptyDir(path: string): Promise<boolean> {
	const entries = await readdir(path).catch(() => null);
	return entries === null || entries.length === 0;
}

async function runGenerate(kind?: string, name?: string): Promise<void> {
	if (!kind || !name || !isGenerateKind(kind)) {
		return fail(
			`Usage: bunstone generate <${GENERATE_KINDS.join("|")}> <name>`,
		);
	}
	const file = generate(kind, name);
	if (!force && (await Bun.file(file.path).exists())) {
		return fail(
			`Refusing to overwrite ${file.path}. Re-run with --force to replace it.`,
		);
	}
	await Bun.write(file.path, file.content);
	console.log(`Created ${file.path}`);
}

async function buildApp(entry = "src/main.ts"): Promise<void> {
	const result = await Bun.build({
		entrypoints: [entry],
		outdir: "dist",
		target: "bun",
		minify: true,
	});
	if (!result.success) {
		fail(result.logs.map((log) => log.message).join("\n"));
		return;
	}
	console.log("Built to dist/");
}

async function runBun(argv: string[]): Promise<void> {
	const proc = Bun.spawn(["bun", ...argv], {
		stdout: "inherit",
		stderr: "inherit",
	});
	process.exit(await proc.exited);
}

async function listExports(): Promise<void> {
	const api = await import("../dist/index.js").catch(() => import("../index"));
	console.log(Object.keys(api).sort().join("\n"));
}

function printHelp(): void {
	console.log(`Bunstone CLI

  bunstone new <name>                 scaffold a new project
  bunstone run <entry>                run an entrypoint with Bun
  bunstone build [entry]              bundle the app to dist/
  bunstone generate <kind> <name>     generate controller|service|module
  bunstone exports                    list public exports

  --force                             overwrite existing files (new, generate)`);
}

function fail(message: string): void {
	console.error(message);
	process.exitCode = 1;
}

await main();
