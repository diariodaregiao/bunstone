#!/usr/bin/env bun
import {
	copyFile,
	mkdir as fsMkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { join } from "node:path";

// ── Tiny ANSI helpers (no external dep) ──────────────────────────────────────
const R = "\x1b[0m";
const bold = (s: string) => `\x1b[1m${s}${R}`;
const red = (s: string) => `\x1b[31m${s}${R}`;
const yellow = (s: string) => `\x1b[33m${s}${R}`;
const green = (s: string) => `\x1b[32m${s}${R}`;
const cyan = (s: string) => `\x1b[36m${s}${R}`;
const gray = (s: string) => `\x1b[90m${s}${R}`;
const BORDER = "━".repeat(64);
const THIN = "─".repeat(64);

// ── Arg parsing ───────────────────────────────────────────────────────────────
const args = Bun.argv.slice(2);
const command = args[0];

// ─────────────────────────────────────────────────────────────────────────────
// bunstone run [bun-flags...] <entrypoint>
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regexp that matches Bun's raw import error line.
 * e.g.  SyntaxError: Export named 'RabbitMessage' not found in module '…/bunstone/dist/index.js'.
 */
const BUN_EXPORT_RE = /Export named '(.+?)' not found in module '(.+?)'/;

async function runCommand(runArgs: string[]) {
	if (runArgs.length === 0) {
		console.error(red("✖  Usage: bunstone run [bun-flags...] <entrypoint.ts>"));
		process.exit(1);
	}

	// Separate bun flags (start with -) from the entrypoint
	const bunFlags: string[] = [];
	let entrypoint = "";
	for (const arg of runArgs) {
		if (arg.startsWith("-") && !entrypoint) bunFlags.push(arg);
		else entrypoint = arg;
	}

	if (!entrypoint) {
		console.error(red("✖  No entrypoint file specified."));
		console.error(gray("   Usage: bunstone run [--watch] src/main.ts"));
		process.exit(1);
	}

	const cmd = ["bun", ...bunFlags, entrypoint];

	const proc = Bun.spawn(cmd, {
		stdin: "inherit",
		stdout: "inherit",
		stderr: "pipe",
	});

	// Accumulate stderr so we can inspect it for the import error pattern
	const stderrChunks: Uint8Array[] = [];
	const stderrReader = proc.stderr.getReader();

	(async () => {
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await stderrReader.read();
			if (done) break;
			stderrChunks.push(value);

			// Write to real stderr immediately so the developer still sees everything
			process.stderr.write(decoder.decode(value));
		}
	})();

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const decoder = new TextDecoder();
		const fullStderr = stderrChunks.map((c) => decoder.decode(c)).join("");

		const match = BUN_EXPORT_RE.exec(fullStderr);
		if (match) {
			const [, name, modulePath] = match;
			printImportError(name, modulePath);
		}
	}

	process.exit(exitCode);
}

function printImportError(name: string, modulePath: string) {
	// Lazy-load the utils so the CLI does not depend on the built dist
	const pkg = modulePath.includes("node_modules/")
		? modulePath.replace(/.*node_modules\//, "").replace(/\/dist.*/, "")
		: modulePath;

	// These are inlined here (not imported from dist) so the CLI works even
	// before the user runs `bun build`.
	const TYPE_ONLY: ReadonlySet<string> = new Set([
		"RabbitMessage",
		"RabbitPublishOptions",
		"RabbitSubscribeOptions",
		"DeadLetterMessage",
		"DeadLetterDeathInfo",
		"RequeueOptions",
		"RabbitMQExchangeConfig",
		"RabbitMQQueueBinding",
		"RabbitMQQueueConfig",
		"RabbitMQReconnectConfig",
		"RabbitMQModuleOptions",
		"HttpRequest",
		"ModuleConfig",
		"Options",
		"GuardContract",
	]);

	const ALL_VALUES = [
		"CacheAdapter",
		"FormDataAdapter",
		"UploadAdapter",
		"EmailModule",
		"EmailService",
		"EmailLayout",
		"AppStartup",
		"Layout",
		"Controller",
		"Get",
		"Post",
		"Put",
		"Patch",
		"Delete",
		"Head",
		"RateLimit",
		"RateLimitGuard",
		"RedisStorage",
		"CommandBus",
		"CqrsModule",
		"CommandHandler",
		"EventHandler",
		"QueryHandler",
		"Saga",
		"EventBus",
		"QueryBus",
		"SqlModule",
		"SqlService",
		"BullMqModule",
		"QueueService",
		"Processor",
		"Process",
		"RabbitMQModule",
		"RabbitMQService",
		"RabbitMQDeadLetterService",
		"RabbitMQConnection",
		"RabbitConsumer",
		"RabbitSubscribe",
		"BunstoneError",
		"DependencyResolutionError",
		"ModuleInitializationError",
		"ConfigurationError",
		"CqrsError",
		"DatabaseError",
		"BullMQError",
		"RabbitMQError",
		"ScheduleError",
		"TestingError",
		"RateLimitError",
		"UploadError",
		"EmailError",
		"HttpParamError",
		"GuardError",
		"AdapterError",
		"ImportError",
		"ErrorFormatter",
		"Guard",
		"UseGuards",
		"HttpException",
		"BadRequestException",
		"UnauthorizedException",
		"ForbiddenException",
		"NotFoundException",
		"ConflictException",
		"UnprocessableEntityException",
		"InternalServerErrorException",
		"OkResponse",
		"CreatedResponse",
		"NoContentResponse",
		"HttpMethod",
		"Body",
		"Param",
		"Query",
		"Headers",
		"Req",
		"Res",
		"FormData",
		"Injectable",
		"Jwt",
		"JwtModule",
		"JwtService",
		"UseJwt",
		"Module",
		"OnModuleInit",
		"OnModuleDestroy",
		"ApiTags",
		"ApiOperation",
		"ApiResponse",
		"ApiBody",
		"Render",
		"Cron",
		"Timeout",
		"Test",
		"TestingModuleBuilder",
		"TestApp",
		"Logger",
	];

	const isTypeOnly = TYPE_ONLY.has(name);
	const suggestions = closestMatchesCli(
		name,
		isTypeOnly ? ALL_VALUES : [...ALL_VALUES, ...TYPE_ONLY],
	);

	const code = isTypeOnly ? "BNS-IMP-001" : "BNS-IMP-002";

	console.error(`\n${red(BORDER)}`);
	console.error(red(bold("  💥  Bunstone — Import Error")));
	console.error(`${red(BORDER)}\n`);

	console.error(
		`  ${yellow(bold("Code     :"))} ${bold(code)}  ${gray(`(ImportError)`)}`,
	);

	if (isTypeOnly) {
		console.error(
			`  ${yellow(bold("Message  :"))} '${name}' is a ${bold("type-only")} export of '${pkg}' — it does not exist at runtime.`,
		);
		console.error(`\n  ${green(bold("💡 How to fix:"))}`);
		console.error(
			green(
				[
					`    Replace the import with 'import type':`,
					``,
					`      ${red("✗")}  import { ${name} } from '${pkg}'`,
					`      ${green("✓")}  import type { ${name} } from '${pkg}'`,
				].join("\n"),
			),
		);
		if (suggestions.length > 0) {
			console.error(
				`\n  ${cyan("If you were looking for a runtime value with a similar name:")}`,
			);
			for (const s of suggestions) {
				console.error(`    ${gray("→")} ${s}`);
			}
		}
	} else {
		console.error(
			`  ${yellow(bold("Message  :"))} '${name}' is not exported by '${pkg}'.`,
		);
		console.error(`\n  ${green(bold("💡 How to fix:"))}`);
		console.error(green(`    Check the spelling of the imported name.`));
		console.error(
			green(
				`    Run ${bold("bunstone exports")} to see all available exports.`,
			),
		);
		if (suggestions.length > 0) {
			console.error(`\n  ${cyan("Did you mean one of these?")}`);
			for (const s of suggestions) {
				console.error(`    ${gray("→")} ${s}`);
			}
		}
	}

	console.error(`\n${red(THIN)}`);
	console.error(red(bold("  ✖  Fix the import above and restart.")));
	console.error(`${red(BORDER)}\n`);
}

/** Minimal inline Levenshtein for the CLI (avoids importing from dist). */
function closestMatchesCli(
	name: string,
	candidates: Iterable<string>,
	limit = 5,
	maxDist = 4,
): string[] {
	function dist(a: string, b: string) {
		const s1 = a.toLowerCase();
		const s2 = b.toLowerCase();
		const [m, n] = [s1.length, s2.length];
		const dp = Array.from({ length: m + 1 }, (_, i) =>
			Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
		);
		for (let i = 1; i <= m; i++)
			for (let j = 1; j <= n; j++)
				dp[i][j] =
					s1[i - 1] === s2[j - 1]
						? dp[i - 1][j - 1]
						: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		return dp[m][n];
	}

	const results: { name: string; d: number }[] = [];
	for (const c of candidates) {
		const d = dist(name, c);
		if (d <= maxDist) results.push({ name: c, d });
	}
	return results
		.sort((a, b) => a.d - b.d)
		.slice(0, limit)
		.map((r) => r.name);
}

// ─────────────────────────────────────────────────────────────────────────────
// bunstone exports
// ─────────────────────────────────────────────────────────────────────────────

async function exportsCommand() {
	const VALUE_EXPORTS = [
		"CacheAdapter",
		"FormDataAdapter",
		"UploadAdapter",
		"EmailModule",
		"EmailService",
		"EmailLayout",
		"AppStartup",
		"Layout",
		"Controller",
		"Get",
		"Post",
		"Put",
		"Patch",
		"Delete",
		"Head",
		"RateLimit",
		"RateLimitGuard",
		"RedisStorage",
		"CommandBus",
		"CqrsModule",
		"CommandHandler",
		"EventHandler",
		"QueryHandler",
		"Saga",
		"EventBus",
		"QueryBus",
		"SqlModule",
		"SqlService",
		"BullMqModule",
		"QueueService",
		"Processor",
		"Process",
		"RabbitMQModule",
		"RabbitMQService",
		"RabbitMQDeadLetterService",
		"RabbitMQConnection",
		"RabbitConsumer",
		"RabbitSubscribe",
		"BunstoneError",
		"DependencyResolutionError",
		"ModuleInitializationError",
		"ConfigurationError",
		"CqrsError",
		"DatabaseError",
		"BullMQError",
		"RabbitMQError",
		"ScheduleError",
		"TestingError",
		"RateLimitError",
		"UploadError",
		"EmailError",
		"HttpParamError",
		"GuardError",
		"AdapterError",
		"ImportError",
		"ErrorFormatter",
		"Guard",
		"UseGuards",
		"HttpException",
		"BadRequestException",
		"UnauthorizedException",
		"ForbiddenException",
		"NotFoundException",
		"ConflictException",
		"UnprocessableEntityException",
		"InternalServerErrorException",
		"OkResponse",
		"CreatedResponse",
		"NoContentResponse",
		"HttpMethod",
		"Body",
		"Param",
		"Query",
		"Headers",
		"Req",
		"Res",
		"FormData",
		"Injectable",
		"Jwt",
		"JwtModule",
		"JwtService",
		"UseJwt",
		"Module",
		"OnModuleInit",
		"OnModuleDestroy",
		"ApiTags",
		"ApiOperation",
		"ApiResponse",
		"ApiBody",
		"Render",
		"Cron",
		"Timeout",
		"Test",
		"TestingModuleBuilder",
		"TestApp",
		"Logger",
	];
	const TYPE_ONLY_EXPORTS = [
		"RabbitMessage",
		"RabbitPublishOptions",
		"RabbitSubscribeOptions",
		"DeadLetterMessage",
		"DeadLetterDeathInfo",
		"RequeueOptions",
		"RabbitMQExchangeConfig",
		"RabbitMQQueueBinding",
		"RabbitMQQueueConfig",
		"RabbitMQReconnectConfig",
		"RabbitMQModuleOptions",
		"HttpRequest",
		"ModuleConfig",
		"Options",
		"GuardContract",
	];

	console.log(`\n${bold("@grupodiariodaregiao/bunstone")} — Public Exports\n`);
	console.log(cyan(bold("  Value exports  ")) + gray("(import { ... })"));
	for (const name of VALUE_EXPORTS.sort())
		console.log(`    ${gray("·")} ${name}`);

	console.log();
	console.log(
		yellow(bold("  Type-only exports  ")) + gray("(import type { ... })"),
	);
	for (const name of TYPE_ONLY_EXPORTS.sort())
		console.log(`    ${gray("·")} ${name}`);
	console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// bunstone new <project-name>
// ─────────────────────────────────────────────────────────────────────────────

const starterPath = join(import.meta.dir, "..", "starter");

async function copyDir(src: string, dest: string) {
	await fsMkdir(dest, { recursive: true });
	const entries = await readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);

		if (entry.isDirectory()) await copyDir(srcPath, destPath);
		else await copyFile(srcPath, destPath);
	}
}

async function scaffold(projectName_?: string) {
	const projectName = projectName_ ?? "my-bunstone-app";
	const projectPath = join(process.cwd(), projectName);

	console.log(`🚀 Scaffolding new Bunstone project in ${projectPath}...`);

	try {
		await copyDir(starterPath, projectPath);

		const pkgPath = join(projectPath, "package.json");
		const pkgContent = await readFile(pkgPath, "utf-8");
		const pkg = JSON.parse(pkgContent);
		pkg.name = projectName;
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

		console.log("📦 Installing dependencies...");
		try {
			const installProc = Bun.spawn({
				cmd: ["bun", "install"],
				cwd: projectPath,
				stdout: "inherit",
				stderr: "inherit",
			});
			await installProc.exited;
		} catch (_e) {
			console.warn("⚠️ Could not run 'bun install'. Please run it manually.");
		}

		console.log("\n✅ Project created successfully!");
		console.log(`\nNext steps:\n  cd ${projectName}\n  bun dev\n`);
	} catch (error) {
		console.error("❌ Error scaffolding project:", error);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────────────────

function printHelp() {
	console.log(`
${bold("bunstone")} — CLI for the Bunstone framework

${cyan("Usage:")}
  bunstone new <project-name>          Scaffold a new project
  bunstone run [bun-flags] <entry>     Run your app with enhanced error messages
  bunstone exports                     List all public exports

${cyan("Examples:")}
  bunstone new my-api
  bunstone run src/main.ts
  bunstone run --watch src/main.ts
`);
}

async function main() {
	if (command === "run") {
		await runCommand(args.slice(1));
		return;
	}

	if (command === "exports") {
		await exportsCommand();
		return;
	}

	if (command === "new" || (command && !args[1])) {
		await scaffold(command === "new" ? args[1] : command);
		return;
	}

	printHelp();
	process.exit(1);
}

await main();
