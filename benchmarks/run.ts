import { spawn } from "node:child_process";
import { join } from "node:path";
import autocannon from "autocannon";

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const CONNECTIONS = 100;
const DURATION = 10;

interface Route {
	name: string;
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
}

const routes: Route[] = [
	{ name: "GET /json", url: `${BASE}/json` },
	{ name: "GET /param/:id", url: `${BASE}/param/42` },
	{ name: "GET /query", url: `${BASE}/query?q=dev` },
	{ name: "GET /di/:id (DI)", url: `${BASE}/di/42` },
	{
		name: "POST /validate (zod)",
		url: `${BASE}/validate`,
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: "ada", age: 30 }),
	},
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitReady(): Promise<void> {
	for (let i = 0; i < 50; i++) {
		try {
			await fetch(`${BASE}/json`);
			return;
		} catch {
			await sleep(200);
		}
	}
	throw new Error("benchmark server did not start");
}

async function run(route: Route, connections: number, duration: number) {
	return autocannon({
		url: route.url,
		method: (route.method ?? "GET") as "GET",
		headers: route.headers,
		body: route.body,
		connections,
		duration,
	});
}

async function bench(route: Route) {
	await run(route, 50, 2);
	const result = await run(route, CONNECTIONS, DURATION);
	return {
		route: route.name,
		"req/s": Math.round(result.requests.average),
		"p50 (ms)": result.latency.p50,
		"p99 (ms)": result.latency.p99,
		"avg (ms)": result.latency.average,
		non2xx: result.non2xx,
	};
}

const server = spawn("bun", ["run", join(import.meta.dir, "server.ts")], {
	stdio: "ignore",
	env: { ...process.env, BENCH_PORT: String(PORT) },
});

try {
	await waitReady();
	console.log(
		`Bunstone benchmark — ${CONNECTIONS} connections, ${DURATION}s per route\n`,
	);
	const results = [];
	for (const route of routes) {
		process.stdout.write(`  ${route.name} ... `);
		const row = await bench(route);
		process.stdout.write(`${row["req/s"]} req/s\n`);
		results.push(row);
	}
	console.log();
	console.table(results);
} finally {
	server.kill("SIGKILL");
}
