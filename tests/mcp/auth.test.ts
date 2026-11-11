import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Client } from "@modelcontextprotocol/client";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { UnauthorizedException } from "@/http/exceptions";
import { Tool } from "@/mcp/decorators";
import { McpModule } from "@/mcp/mcp-module";
import { connectMcpClient } from "@/mcp/testing";
import type { AuthInfo, McpContext, McpTokenVerifier } from "@/mcp/types";
import { NotesModule, NotesService } from "./fixtures/notes";

const RESOURCE = "https://api.example.com/mcp";

/** Resolved through DI, so it can inject what it needs. */
@Injectable()
class TokenVerifier implements McpTokenVerifier {
	constructor(readonly notes: NotesService) {}

	verifyAccessToken(token: string): AuthInfo | null {
		if (token === "expired-format")
			throw new UnauthorizedException("bad token");
		if (!token.startsWith("ok:")) return null;
		return {
			token,
			clientId: "alice",
			scopes: token.slice(3).split(",").filter(Boolean),
			expiresAt: Math.floor(Date.now() / 1000) + 3600,
			resource: new URL(RESOURCE),
		};
	}
}

@Injectable()
class ScopedTools {
	@Tool({ description: "needs write", scopes: ["notes:write"] })
	write(_input: unknown, ctx: McpContext) {
		return { client: ctx.authInfo?.clientId, scopes: ctx.authInfo?.scopes };
	}

	@Tool({ description: "open to any valid token" })
	read() {
		return "ok";
	}
}

@Module({
	imports: [
		McpModule.register({
			name: "secure",
			version: "1.0.0",
			auth: {
				verifier: TokenVerifier,
				resource: RESOURCE,
				authorizationServers: ["https://auth.example.com"],
				scopesSupported: ["notes:read", "notes:write"],
			},
		}),
		NotesModule,
	],
	providers: [ScopedTools],
})
class AppModule {}

describe("MCP OAuth", () => {
	let app: Application;
	let root: string;

	beforeAll(async () => {
		app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		app.listen(0);
		root = app.getServer()?.url.href ?? "";
	});

	afterAll(() => app.close());

	const post = (headers: Record<string, string> = {}) =>
		fetch(`${root}mcp`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				...headers,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});

	it("challenges a request without a token", async () => {
		const res = await post();
		expect(res.status).toBe(401);
		expect(res.headers.get("www-authenticate")).toContain(
			"/.well-known/oauth-protected-resource/mcp",
		);
	});

	it("refuses a token the verifier rejects", async () => {
		expect((await post({ authorization: "Bearer nope" })).status).toBe(401);
		expect(
			(await post({ authorization: "Bearer expired-format" })).status,
		).toBe(401);
	});

	it("serves the protected resource metadata", async () => {
		const res = await fetch(`${root}.well-known/oauth-protected-resource/mcp`);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			resource: RESOURCE,
			authorization_servers: ["https://auth.example.com"],
			bearer_methods_supported: ["header"],
			scopes_supported: ["notes:read", "notes:write"],
		});
	});

	describe("with a valid token", () => {
		let client: Client;

		afterAll(() => client?.close());

		it("passes the verified token to the tool", async () => {
			client = await connectMcpClient(app, { token: "ok:notes:write" });
			const result = await client.callTool({ name: "write", arguments: {} });
			const body = JSON.parse(
				(result.content as { text: string }[])[0]?.text ?? "",
			);
			expect(body).toEqual({ client: "alice", scopes: ["notes:write"] });
		});

		it("asks for missing scopes (step-up) instead of running the tool", async () => {
			const readOnly = await connectMcpClient(app, { token: "ok:notes:read" });
			expect(
				(await readOnly.callTool({ name: "read", arguments: {} })).content,
			).toEqual([{ type: "text", text: "ok" }]);
			await expect(
				readOnly.callTool({ name: "write", arguments: {} }),
			).rejects.toThrow(/insufficient scope/i);
			await readOnly.close();
		});
	});
});
