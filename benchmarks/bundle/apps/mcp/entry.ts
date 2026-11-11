import "reflect-metadata";
import { z } from "zod";
import { Application, Injectable, Module } from "@grupodiariodaregiao/bunstone";
import { McpModule, Tool } from "@grupodiariodaregiao/bunstone/mcp";

@Injectable()
class MathTools {
	@Tool({ description: "Doubles a number", inputSchema: z.object({ n: z.number() }) })
	double({ n }: { n: number }) {
		return String(n * 2);
	}
}

@Module({
	imports: [McpModule.register({ name: "bundle", version: "1.0.0" })],
	providers: [MathTools],
})
class AppModule {}

const app = await Application.create(AppModule, { logStartup: false, gracefulShutdown: false });
const booted = performance.now();
app.listen(0);
const res = await fetch(`${app.getServer()!.url}mcp`, {
	method: "POST",
	headers: {
		"content-type": "application/json",
		accept: "application/json, text/event-stream",
		"mcp-protocol-version": "2025-06-18",
	},
	body: JSON.stringify({
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "bundle", version: "0" } },
	}),
});
const text = await res.text();
await app.close();
console.log(JSON.stringify({ ok: res.status === 200 && text.includes('"serverInfo"'), booted, rss: process.memoryUsage().rss }));
