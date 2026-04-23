import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
	TYPE_ONLY_EXPORTS,
	VALUE_EXPORTS,
} from "../lib/utils/known-exports";

const projectRoot = join(import.meta.dir, "..");
const docsRoot = join(projectRoot, "docs");
const examplesRoot = join(projectRoot, "examples");
const outputPath = join(projectRoot, "AGENTS.md");

const docPriority = [
	"docs/index.md",
	"docs/getting-started.md",
	"docs/application-runtime.md",
	"docs/cli.md",
	"docs/dependency-injection.md",
	"docs/logging.md",
	"docs/routing-params.md",
	"docs/guards-jwt.md",
	"docs/cqrs.md",
	"docs/scheduling.md",
	"docs/database-sql.md",
	"docs/openapi.md",
	"docs/rate-limiting.md",
	"docs/mvc-ssr.md",
	"docs/testing.md",
	"docs/bullmq.md",
	"docs/rabbitmq.md",
	"docs/on-module-init.md",
	"docs/on-module-destroy.md",
	"docs/pt-BR/index.md",
	"docs/pt-BR/getting-started.md",
	"docs/pt-BR/application-runtime.md",
	"docs/pt-BR/cli.md",
	"docs/pt-BR/dependency-injection.md",
	"docs/pt-BR/logging.md",
];

const examplePriority = [
	"examples/01-basic-app/index.ts",
	"examples/02-routing-params/index.ts",
	"examples/03-guards-auth/index.ts",
	"examples/04-cqrs/index.ts",
	"examples/05-database-sql/index.ts",
	"examples/06-scheduling/index.ts",
	"examples/07-adapters/index.ts",
	"examples/08-openapi/index.ts",
	"examples/08-ratelimit/index.ts",
	"examples/09-ssr/index.tsx",
	"examples/10-ssr-mvc/index.ts",
	"examples/11-email-adapter/index.ts",
	"examples/11-email-adapter/WelcomeEmail.tsx",
	"examples/12-bullmq/index.ts",
	"examples/13-rabbitmq/index.ts",
	"examples/package.json",
];

async function walk(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === ".vitepress" || entry.name === "assets") return [];
				return walk(fullPath);
			}
			return [fullPath];
		}),
	);

	return files.flat();
}

function compareByPriority(paths: string[], priority: string[]) {
	const order = new Map(priority.map((item, index) => [item, index]));
	return [...paths].sort((a, b) => {
		const aOrder = order.get(a) ?? Number.MAX_SAFE_INTEGER;
		const bOrder = order.get(b) ?? Number.MAX_SAFE_INTEGER;
		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.localeCompare(b);
	});
}

function toPosixPath(value: string) {
	return value.split("\\").join("/");
}

function formatCodeBlock(path: string, contents: string) {
	const extension = path.endsWith(".tsx")
		? "tsx"
		: path.endsWith(".ts")
			? "ts"
			: path.endsWith(".json")
				? "json"
				: "md";
	return [`## Source: \`${path}\``, "", `\`\`\`\`${extension}`, contents.trim(), "````"].join(
		"\n",
	);
}

async function main() {
	const docFilesRaw = (await walk(docsRoot))
		.map((file) => toPosixPath(relative(projectRoot, file)))
		.filter((file) => file.endsWith(".md"));
	const exampleFilesRaw = (await walk(examplesRoot))
		.map((file) => toPosixPath(relative(projectRoot, file)))
		.filter(
			(file) =>
				file.endsWith(".ts") || file.endsWith(".tsx") || file === "examples/package.json",
		);

	const docFiles = compareByPriority(docFilesRaw, docPriority);
	const exampleFiles = compareByPriority(exampleFilesRaw, examplePriority);

	const docList = docFiles.map((file) => `- \`${file}\``).join("\n");
	const exampleList = exampleFiles.map((file) => `- \`${file}\``).join("\n");

	const docSections = await Promise.all(
		docFiles.map(async (file) => {
			const contents = await readFile(join(projectRoot, file), "utf-8");
			return formatCodeBlock(file, contents);
		}),
	);

	const exampleSections = await Promise.all(
		exampleFiles.map(async (file) => {
			const contents = await readFile(join(projectRoot, file), "utf-8");
			return formatCodeBlock(file, contents);
		}),
	);

	const content = `# Bunstone AGENTS Guide

This file is published with the \`@grupodiariodaregiao/bunstone\` package so coding agents can discover Bunstone's docs and examples directly inside \`node_modules\`.

## Package Paths

- Main package: \`node_modules/@grupodiariodaregiao/bunstone\`
- Markdown docs: \`node_modules/@grupodiariodaregiao/bunstone/docs\`
- Examples: \`node_modules/@grupodiariodaregiao/bunstone/examples\`
- Starter project: \`node_modules/@grupodiariodaregiao/bunstone/starter\`

## Recommended Commands

- Scaffold a new app: \`bunx @grupodiariodaregiao/bunstone new my-app\`
- Shorthand scaffold: \`bunx @grupodiariodaregiao/bunstone my-app\`
- Run an entrypoint with Bunstone CLI diagnostics: \`bunstone run src/main.ts\`
- Build an app for production: \`bunstone build src/main.ts\`
- List public exports: \`bunstone exports\`
- Run tests: \`bun test\`
- Run the local docs site: \`bun run docs:dev\`

## Public Runtime Exports

${VALUE_EXPORTS.map((name) => `- \`${name}\``).join("\n")}

## Public Type-only Exports

${Array.from(TYPE_ONLY_EXPORTS)
	.sort((a, b) => a.localeCompare(b))
	.map((name) => `- \`${name}\``)
	.join("\n")}

## Bundled Markdown Docs

${docList}

## Bundled Examples

${exampleList}

## Full Documentation

${docSections.join("\n\n")}

## Full Examples

${exampleSections.join("\n\n")}
`;

	await writeFile(outputPath, `${content.trim()}\n`);
	console.log(`Generated ${toPosixPath(relative(projectRoot, outputPath))}`);
}

await main();
