import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as api from "../index";

const root = join(import.meta.dir, "..");
const docsDir = join(root, "docs");
const examplesDir = join(root, "examples");

const DOC_ORDER = [
	"index.md",
	"getting-started.md",
	"dependency-injection.md",
	"modules.md",
	"controllers.md",
	"guards-jwt.md",
	"database.md",
	"cqrs.md",
	"event-sourcing.md",
	"messaging.md",
	"scheduling.md",
	"realtime.md",
	"rate-limiting.md",
	"observability.md",
	"testing.md",
	"openapi.md",
	"cli.md",
];

async function listMarkdown(dir: string): Promise<string[]> {
	const entries = await readdir(dir).catch(() => [] as string[]);
	const present = entries.filter((file) => file.endsWith(".md"));
	const ordered = DOC_ORDER.filter((file) => present.includes(file));
	const rest = present.filter((file) => !DOC_ORDER.includes(file)).sort();
	return [...ordered, ...rest];
}

async function listExamples(): Promise<string[]> {
	const entries = await readdir(examplesDir).catch(() => [] as string[]);
	return entries.filter((file) => file.endsWith(".ts")).sort();
}

async function main(): Promise<void> {
	const exportNames = Object.keys(api).sort();
	const docFiles = await listMarkdown(docsDir);
	const exampleFiles = await listExamples();

	const llms = [
		"# Bunstone",
		"",
		"Decorator-based framework for Bun (native Bun.serve, Bun.SQL, Bun.cron).",
		"",
		"## Docs",
		...docFiles.map((file) => `- docs/${file}`),
		"",
		"## Examples",
		...exampleFiles.map((file) => `- examples/${file}`),
		"",
		`## Public exports (${exportNames.length})`,
		exportNames.join(", "),
		"",
	].join("\n");
	await writeFile(join(root, "llms.txt"), `${llms}\n`);

	const parts: string[] = [
		"# Bunstone AGENTS Guide",
		"",
		"This file is published with `@grupodiariodaregiao/bunstone` so coding agents",
		"can read the full documentation directly from `node_modules`.",
		"",
		"Bunstone is a decorator-based framework for Bun (DI, HTTP over native",
		"`Bun.serve`, CQRS + event sourcing, RabbitMQ, scheduling via `Bun.cron`,",
		"SSE & WebSocket, OpenTelemetry). Import everything from",
		"`@grupodiariodaregiao/bunstone`.",
		"",
		`## Public exports (${exportNames.length})`,
		"",
		exportNames.map((name) => `- \`${name}\``).join("\n"),
		"",
		"## Documentation",
	];

	for (const file of docFiles) {
		const content = await readFile(join(docsDir, file), "utf8");
		parts.push("", `## docs/${file}`, "", content.trim());
	}

	for (const file of exampleFiles) {
		const content = await readFile(join(examplesDir, file), "utf8");
		parts.push("", `## examples/${file}`, "", "```ts", content.trim(), "```");
	}

	await writeFile(join(root, "AGENTS.md"), `${parts.join("\n")}\n`);
	await writeFile(join(root, "CLAUDE.md"), "@AGENTS.md\n");

	console.log(
		`Generated AGENTS.md (${docFiles.length} docs, ${exampleFiles.length} examples), llms.txt, CLAUDE.md`,
	);
}

await main();
