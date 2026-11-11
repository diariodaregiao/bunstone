/**
 * Measures what a production build of a Bunstone app carries, the way users
 * build one: the library is packed as published (dist + package.json),
 * installed into a scratch project, and each app under `apps/` is bundled
 * like `bunstone build` does (target bun, ESM, minified, packages bundled).
 *
 *   bun run benchmark:bundle            # table
 *   bun run benchmark:bundle --json     # machine-readable
 *   bun run benchmark:bundle --skip-build
 *
 * For every app it reports the bundle size (raw and gzip), the biggest
 * packages inside it, and the startup time and memory of the bundled app
 * (median of several runs). It also checks that the bundled app actually
 * works, and that an app builds when the optional `mongodb` driver is not
 * installed.
 */
import { cp, mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const appsDir = join(import.meta.dir, "apps");
const args = new Set(process.argv.slice(2));
const RUNS = Number(process.env.BUNDLE_RUNS ?? 15);

interface AppReport {
	app: string;
	kb: number;
	gzipKb: number;
	packages: Record<string, number>;
	startupMs: number;
	rssMb: number;
	ok: boolean;
}

async function packLibrary(work: string): Promise<string> {
	if (!args.has("--skip-build")) {
		const build = Bun.spawnSync(["bun", "run", "build"], {
			cwd: root,
			stdout: "ignore",
			stderr: "pipe",
		});
		if (build.exitCode !== 0) {
			throw new Error(`library build failed:\n${build.stderr.toString()}`);
		}
	}
	const modules = join(work, "node_modules");
	await mkdir(join(modules, "@grupodiariodaregiao"), { recursive: true });
	// every dependency the library resolves at runtime, as an install would
	for (const entry of await readdir(join(root, "node_modules"))) {
		if (entry === "@grupodiariodaregiao" || entry === ".bin") continue;
		await symlink(join(root, "node_modules", entry), join(modules, entry));
	}
	const pkg = join(modules, "@grupodiariodaregiao", "bunstone");
	await mkdir(pkg, { recursive: true });
	await cp(join(root, "dist"), join(pkg, "dist"), { recursive: true });
	await cp(join(root, "package.json"), join(pkg, "package.json"));
	return modules;
}

async function bundle(app: string, work: string, outdir: string) {
	const appDir = join(work, "apps", app);
	return Bun.build({
		entrypoints: [join(appDir, "entry.ts")],
		outdir,
		target: "bun",
		format: "esm",
		minify: true,
		metafile: true,
		throw: false,
	});
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

async function measure(app: string, work: string): Promise<AppReport> {
	const outdir = join(work, "out", app);
	const result = await bundle(app, work, outdir);
	if (!result.success) {
		throw new Error(
			`${app}: build failed: ${result.logs.map((log) => log.message).join(" | ")}`,
		);
	}
	const output = result.outputs[0];
	if (!output) throw new Error(`${app}: no output`);
	const bytes = new Uint8Array(await Bun.file(output.path).arrayBuffer());

	const packages: Record<string, number> = {};
	const outputs = (result.metafile as { outputs: Record<string, { inputs: Record<string, { bytesInOutput: number }> }> })
		.outputs;
	for (const meta of Object.values(outputs)) {
		for (const [input, info] of Object.entries(meta.inputs ?? {})) {
			const match = input.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
			const key = match?.[1] ?? "(app)";
			packages[key] = (packages[key] ?? 0) + info.bytesInOutput;
		}
	}

	const startups: number[] = [];
	const rss: number[] = [];
	let ok = true;
	for (let run = 0; run < RUNS; run++) {
		const proc = Bun.spawnSync(["bun", output.path], {
			cwd: join(work, "apps", app),
			stdout: "pipe",
			stderr: "pipe",
		});
		const line = proc.stdout.toString().trim().split("\n").at(-1) ?? "";
		try {
			const report = JSON.parse(line) as {
				ok: boolean;
				booted: number;
				rss: number;
			};
			ok &&= report.ok && proc.exitCode === 0;
			startups.push(report.booted);
			rss.push(report.rss);
		} catch {
			ok = false;
			if (run === 0) {
				console.error(`${app}: unexpected output\n${proc.stdout}\n${proc.stderr}`);
			}
		}
	}

	return {
		app,
		kb: bytes.byteLength / 1024,
		gzipKb: Bun.gzipSync(bytes).byteLength / 1024,
		packages: Object.fromEntries(
			Object.entries(packages)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 6)
				.map(([name, size]) => [name, Math.round(size / 1024)]),
		),
		startupMs: median(startups),
		rssMb: median(rss) / 1024 / 1024,
		ok,
	};
}

/**
 * `bunstone build` must work for an app that never installed `mongodb`, which
 * is most of them. Returns the bundle size in KB, or `null` when it fails.
 */
async function buildWithoutMongo(work: string): Promise<number | null> {
	const mongo = join(work, "node_modules", "mongodb");
	await rm(mongo, { force: true });
	try {
		const result = await bundle("hello", work, join(work, "out", "no-mongo"));
		const output = result.success ? result.outputs[0] : undefined;
		return output ? Bun.file(output.path).size / 1024 : null;
	} finally {
		await symlink(join(root, "node_modules", "mongodb"), mongo);
	}
}

const work = await mkdtemp(join(tmpdir(), "bunstone-bundle-"));
try {
	await packLibrary(work);
	await cp(appsDir, join(work, "apps"), { recursive: true });

	const apps = (await readdir(appsDir)).sort();
	const reports: AppReport[] = [];
	for (const app of apps) reports.push(await measure(app, work));
	const withoutMongo = await buildWithoutMongo(work);

	if (args.has("--json")) {
		console.log(
			JSON.stringify({ reports, helloWithoutMongoKb: withoutMongo }, null, 2),
		);
	} else {
		console.table(
			reports.map((report) => ({
				app: report.app,
				"bundle KB": report.kb.toFixed(0),
				"gzip KB": report.gzipKb.toFixed(0),
				"startup ms": report.startupMs.toFixed(1),
				"RSS MB": report.rssMb.toFixed(1),
				works: report.ok ? "yes" : "NO",
			})),
		);
		for (const report of reports) {
			const top = Object.entries(report.packages)
				.map(([name, kb]) => `${name} ${kb}KB`)
				.join(", ");
			console.log(`${report.app}: ${top}`);
		}
		console.log(
			`hello without mongodb installed: ${withoutMongo === null ? "BUILD FAILS" : `${withoutMongo.toFixed(0)} KB`}`,
		);
	}
	if (withoutMongo === null || reports.some((report) => !report.ok)) {
		process.exitCode = 1;
	}
} finally {
	await rm(work, { recursive: true, force: true });
}
