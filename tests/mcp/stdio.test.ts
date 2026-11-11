import { describe, expect, it } from "bun:test";
import { join } from "node:path";

describe("MCP over stdio", () => {
	it("serves a client that launches the app as a process", async () => {
		const { Client } = await import("@modelcontextprotocol/client");
		const { StdioClientTransport } =
			await import("@modelcontextprotocol/client/stdio");
		const transport = new StdioClientTransport({
			command: process.execPath,
			args: [join(import.meta.dir, "fixtures", "stdio-app.ts")],
			cwd: join(import.meta.dir, "..", ".."),
			stderr: "pipe",
		});
		const client = new Client({ name: "t", version: "0" });
		await client.connect(transport);

		const result = await client.callTool({ name: "whoami", arguments: {} });
		const body = JSON.parse(
			(result.content as { text: string }[])[0]?.text ?? "",
		);
		// no HTTP request behind a stdio call
		expect(body).toMatchObject({ transport: "stdio", tenant: null });

		const greeting = await client.callTool({
			name: "greet",
			arguments: { who: "stdio" },
		});
		expect(greeting.content).toEqual([{ type: "text", text: "hello stdio" }]);
		await client.close();
	}, 20_000);
});
