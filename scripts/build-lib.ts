/**
 * Builds the published library: one output module per source file, with the
 * code they share split into chunks, so an app's bundler can drop every
 * module the app never imports (see "sideEffects" in package.json). A single
 * bundled file would force it to keep, or at best guess about, all of them.
 */
import { Glob } from "bun";

const root = new URL("..", import.meta.url).pathname;
const sources: string[] = [];
for await (const file of new Glob("src/**/*.ts").scan({ cwd: root })) {
	// the CLI is its own executable (bin/), never part of an app
	if (!file.startsWith("src/cli/")) sources.push(file);
}

const result = await Bun.build({
	entrypoints: ["index.ts", ...sources.sort()].map((file) => root + file),
	outdir: `${root}dist`,
	root,
	target: "bun",
	packages: "external",
	splitting: true,
	throw: false,
});
if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}
console.log(`Built ${result.outputs.length} files to dist/`);
