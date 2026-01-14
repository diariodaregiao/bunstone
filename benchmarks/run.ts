import { spawn } from "node:child_process";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import autocannon from "autocannon";

const frameworks = [
	{ name: "express", path: "./benchmarks/frameworks/express/server.ts" },
	{ name: 'nest (with "@nestjs/platform-express")', path: "./benchmarks/frameworks/nest-express/server.ts" },
	{ name: "fastify", path: "./benchmarks/frameworks/fastify/server.ts" },
	{ name: 'nest (with "@nestjs/platform-fastify")', path: "./benchmarks/frameworks/nest-fastify/server.ts" },
	{ name: "bunstone", path: "./benchmarks/frameworks/bunstone/server.ts" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBenchmark(framework: typeof frameworks[0]) {
	console.log(`\nTesting ${framework.name}...`);

	const server = spawn("bun", ["run", framework.path], {
		stdio: "inherit",
	});

	// Wait for server to start
	await sleep(4000);

	const result = await autocannon({
		url: "http://localhost:3000",
		connections: 1024,
		duration: 10,
		pipelining: 1,
	});

	console.log(`${framework.name} results:`);
	console.log(autocannon.printResult(result));

	server.kill();
	await sleep(2000);

	return {
		name: framework.name,
		result,
	};
}

function stripAnsi(str: string) {
	const pattern = [
		"[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
		"(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
	].join("|");

	return str.replace(new RegExp(pattern, "g"), "");
}

async function main() {
	const allResults = [];

	for (const framework of frameworks) {
		const result = await runBenchmark(framework);
		allResults.push(result);
	}

	let txtResult = "";

	for (const res of allResults) {
		txtResult += "-----------------------\n";
		txtResult += `${res.name}\n`;
		txtResult += "-----------------------\n";
		txtResult += `Running 10s test @ http://localhost:3000\n`;
		txtResult += `1024 connections\n\n`;
		txtResult += stripAnsi(autocannon.printResult(res.result));
		txtResult += "\n\n";
	}

	const outputPath = join(process.cwd(), "benchmarks", "benchmark-results.txt");
	writeFileSync(outputPath, txtResult);
	console.log(`\nResults written to ${outputPath}`);
}

main().catch(console.error);
