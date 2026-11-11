import { describe, expect, it } from "bun:test";
import { join } from "node:path";

/**
 * Builds the library as published and bundles real apps the way `bunstone
 * build` does (benchmarks/bundle). Guards what an app's production bundle
 * carries: a static import added to the core, or a module with an import-time
 * side effect, would bring every feature back into every app.
 */
interface Report {
	app: string;
	kb: number;
	packages: Record<string, number>;
	ok: boolean;
}

describe("production bundle", () => {
	it("bundles only what each app uses, and every bundled app works", () => {
		const root = join(import.meta.dir, "..", "..");
		const run = Bun.spawnSync(
			["bun", join(root, "benchmarks", "bundle", "run.ts"), "--json"],
			{ cwd: root, env: { ...process.env, BUNDLE_RUNS: "1" } },
		);
		const output = run.stdout.toString();
		const { reports, helloWithoutMongoKb } = JSON.parse(
			output.slice(output.indexOf("{")),
		) as { reports: Report[]; helloWithoutMongoKb: number | null };
		const byApp = Object.fromEntries(reports.map((r) => [r.app, r]));

		for (const report of reports) {
			expect({ app: report.app, works: report.ok }).toEqual({
				app: report.app,
				works: true,
			});
		}

		// an app without Mongo must build even when the driver is absent
		expect(helloWithoutMongoKb).not.toBeNull();

		const hello = byApp.hello as Report;
		// about 110 KB today; the margin is for honest growth, not for a
		// feature's dependencies leaking back in (those are hundreds of KB)
		expect(hello.kb).toBeLessThan(200);
		for (const dependency of [
			"mongodb",
			"amqplib",
			"jose",
			"@modelcontextprotocol/server",
			"@opentelemetry/sdk-metrics",
		]) {
			expect({ dependency, inHello: dependency in hello.packages }).toEqual({
				dependency,
				inHello: false,
			});
		}

		// features pay only for themselves
		expect("amqplib" in (byApp["cqrs-rabbit"] as Report).packages).toBe(true);
		expect(
			"@modelcontextprotocol/server" in (byApp.mcp as Report).packages,
		).toBe(true);
	}, 240_000);
});
