import { afterAll, describe, expect, it } from "bun:test";
import { dockerComposeAvailable } from "../support/services";

const COMPOSE_DIR = `${import.meta.dir}/traefik`;
const TRAEFIK_URL = "http://127.0.0.1:9876";
const dockerUp = await dockerComposeAvailable();

async function compose(
	args: string[],
	env: Record<string, string> = {},
): Promise<number> {
	const proc = Bun.spawn(["docker", "compose", ...args], {
		cwd: COMPOSE_DIR,
		env: { ...process.env, ...env },
		stdout: "inherit",
		stderr: "inherit",
	});
	return proc.exited;
}

async function recreate(env: Record<string, string>) {
	await compose(["down", "-v"]);
	const code = await compose(
		["up", "-d", "--build", "--wait", "--force-recreate"],
		env,
	);
	if (code !== 0)
		throw new Error(`docker compose failed with exit code ${code}`);
	await waitForTraefik();
}

async function waitForTraefik(maxMs = 60_000) {
	const deadline = Date.now() + maxMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${TRAEFIK_URL}/health`);
			if (res.status === 200) return;
		} catch {
			// stack not ready yet
		}
		await Bun.sleep(500);
	}
	throw new Error("Traefik stack did not become ready in time");
}

async function hitLimited(headers: Record<string, string> = {}) {
	return fetch(`${TRAEFIK_URL}/api/limited`, { headers });
}

async function curlFromNetwork(url: string) {
	const proc = Bun.spawn(
		[
			"docker",
			"run",
			"--rm",
			"--network",
			"traefik_ratelimit",
			"curlimages/curl:8.12.1",
			"-s",
			"-o",
			"/dev/null",
			"-w",
			"%{http_code}",
			url,
		],
		{ stdout: "pipe", stderr: "ignore" },
	);
	const out = await new Response(proc.stdout).text();
	await proc.exited;
	return Number(out.trim());
}

describe.skipIf(!dockerUp)("Traefik rate limit e2e", () => {
	afterAll(async () => {
		await compose(["down", "-v"]);
	}, 60_000);

	it("without trustProxy buckets every client together", async () => {
		await recreate({
			TRUST_PROXY: "false",
			USE_REDIS: "false",
			RATE_LIMIT_MAX: "5",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});
		const statuses = [];
		for (let i = 0; i < 6; i++) {
			statuses.push((await hitLimited()).status);
		}
		expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
		expect(statuses[5]).toBe(429);
	});

	it("with trustProxy gives different Docker clients separate buckets", async () => {
		await recreate({
			TRUST_PROXY: "true",
			USE_REDIS: "false",
			RATE_LIMIT_MAX: "2",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});

		const clientA = await curlFromNetwork("http://traefik/api/limited");
		const clientB = await curlFromNetwork("http://traefik/api/limited");
		expect(clientA).toBe(200);
		expect(clientB).toBe(200);
	}, 120_000);

	it("does not let a forged X-Forwarded-For bypass the limit without trustProxy", async () => {
		await recreate({
			TRUST_PROXY: "false",
			USE_REDIS: "false",
			RATE_LIMIT_MAX: "2",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});

		const statuses = [];
		for (let i = 0; i < 4; i++) {
			statuses.push(
				(
					await hitLimited({
						"x-forwarded-for": `${100 + i}.0.0.1`,
					})
				).status,
			);
		}
		expect(statuses).toEqual([200, 200, 429, 429]);
	}, 120_000);

	it("with two replicas and MemoryStorage multiplies the effective limit", async () => {
		await recreate({
			TRUST_PROXY: "true",
			USE_REDIS: "false",
			RATE_LIMIT_MAX: "5",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});

		const statuses = [];
		for (let i = 0; i < 10; i++) {
			statuses.push((await hitLimited()).status);
		}
		expect(statuses.every((status) => status === 200)).toBe(true);
	}, 120_000);

	it("with two replicas and RedisStorage enforces a fleet-wide cap", async () => {
		await recreate({
			TRUST_PROXY: "true",
			USE_REDIS: "true",
			RATE_LIMIT_MAX: "5",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});

		const statuses = [];
		for (let i = 0; i < 6; i++) {
			statuses.push((await hitLimited()).status);
		}
		expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
		expect(statuses[5]).toBe(429);
	}, 120_000);

	it("preserves Retry-After and X-RateLimit-* through Traefik", async () => {
		await recreate({
			TRUST_PROXY: "true",
			USE_REDIS: "true",
			RATE_LIMIT_MAX: "1",
			REDIS_KEY_PREFIX: `bunstone:traefik:e2e:${crypto.randomUUID()}:`,
		});

		await hitLimited();
		const blocked = await hitLimited();
		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("retry-after")).toBeDefined();
		expect(blocked.headers.get("x-ratelimit-limit")).toBe("1");
		expect(blocked.headers.get("x-ratelimit-remaining")).toBe("0");
		expect(blocked.headers.get("x-ratelimit-reset")).toBeDefined();
	}, 120_000);
});
