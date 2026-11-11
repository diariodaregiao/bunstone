import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Client } from "@modelcontextprotocol/client";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { McpError } from "@/errors";
import { UseGuards } from "@/http/guard";
import type { RequestContext } from "@/http/types";
import { Tool } from "@/mcp/decorators";
import { McpModule } from "@/mcp/mcp-module";
import { connectMcpClient } from "@/mcp/testing";
import { buildOpenApiDocument } from "@/openapi/builder";
import { Test } from "@/testing";
import { NotesModule, NotForbiddenGuard } from "./fixtures/notes";

const base = { gracefulShutdown: false, logStartup: false } as const;

function text(result: unknown): string {
	return (result as { content: { text: string }[] }).content[0]?.text ?? "";
}

describe("MCP primitives (in memory)", () => {
	let moduleRef: Awaited<
		ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>
	>;
	let client: Client;

	beforeAll(async () => {
		moduleRef = await Test.createTestingModule({
			imports: [
				McpModule.register({ name: "notes", version: "1.0.0" }),
				NotesModule,
			],
		}).compile();
		client = await connectMcpClient(moduleRef);
	});

	afterAll(async () => {
		await client.close();
		await moduleRef.close();
	});

	it("lists tools with their JSON schemas", async () => {
		const { tools } = await client.listTools();
		const add = tools.find((tool) => tool.name === "add");
		expect(add?.description).toBe("Save a note and return it");
		expect(add?.inputSchema).toMatchObject({
			type: "object",
			properties: { text: { type: "string", minLength: 1 } },
			required: ["text"],
		});
		expect(add?.outputSchema).toMatchObject({ type: "object" });
	});

	it("calls a tool through DI and returns structured content", async () => {
		const result = await client.callTool({
			name: "add",
			arguments: { text: "Walk the dog" },
		});
		expect(result.structuredContent).toEqual({ id: "2", text: "Walk the dog" });
		expect(JSON.parse(text(result))).toEqual({ id: "2", text: "Walk the dog" });
	});

	it("turns a string into a text result", async () => {
		const result = await client.callTool({
			name: "greet",
			arguments: { who: "Ada" },
		});
		expect(text(result)).toBe("hello Ada");
	});

	it("rejects invalid input before the method runs", async () => {
		const result = await client.callTool({
			name: "add",
			arguments: { text: "" },
		});
		expect(result.isError).toBe(true);
	});

	it("passes the McpContext as the second argument", async () => {
		const result = await client.callTool({ name: "whoami", arguments: {} });
		expect(JSON.parse(text(result))).toEqual({
			kind: "tool",
			name: "whoami",
			transport: "http",
			era: "modern",
			client: null,
			tenant: null,
		});
	});

	it("runs @UseGuards() on the provider and answers Forbidden", async () => {
		const result = await client.callTool({ name: "forbidden", arguments: {} });
		expect(result.isError).toBe(true);
		expect(text(result)).toBe("Forbidden");
		expect(NotForbiddenGuard.seen.at(-1)?.name).toBe("forbidden");
	});

	it("reports an HttpException's message to the model", async () => {
		const result = await client.callTool({ name: "rejects", arguments: {} });
		expect(result.isError).toBe(true);
		expect(text(result)).toBe("That is not a valid note.");
	});

	it("hides an unexpected error's message", async () => {
		const result = await client.callTool({ name: "crashes", arguments: {} });
		expect(result.isError).toBe(true);
		expect(text(result)).toBe("Internal server error");
	});

	it("reads a fixed resource as JSON", async () => {
		const { contents } = await client.readResource({ uri: "notes://all" });
		expect(contents[0]?.mimeType).toBe("application/json");
		expect(JSON.parse((contents[0] as { text: string }).text)[0]).toEqual({
			id: "1",
			text: "Buy milk",
		});
	});

	it("reads bytes as a base64 blob", async () => {
		const { contents } = await client.readResource({ uri: "notes://logo" });
		expect(contents[0]).toMatchObject({
			mimeType: "image/png",
			blob: "iVBORw==",
		});
	});

	it("reads a resource template with its variables", async () => {
		const { contents } = await client.readResource({ uri: "notes://1" });
		expect((contents[0] as { text: string }).text).toBe("Buy milk");
	});

	it("answers a NotFoundException with resource-not-found", async () => {
		await expect(client.readResource({ uri: "notes://999" })).rejects.toThrow(
			/not found/i,
		);
	});

	it("gets a prompt from a string", async () => {
		const prompt = await client.getPrompt({
			name: "summarize",
			arguments: { style: "bullets" },
		});
		expect(prompt.messages[0]?.role).toBe("user");
		expect((prompt.messages[0]?.content as { text: string }).text).toContain(
			"- Buy milk",
		);
	});

	it("also serves 2025-era clients", async () => {
		const legacy = await connectMcpClient(moduleRef, { era: "legacy" });
		const result = await legacy.callTool({ name: "whoami", arguments: {} });
		expect(JSON.parse(text(result)).era).toBe("legacy");
		await legacy.close();
	});
});

/** Stands for a guard such as @Jwt(): fills the request state for the tools. */
@Injectable()
class TenantGuard {
	canActivate(ctx: RequestContext): boolean {
		const tenant = ctx.headers.get("x-tenant");
		if (!tenant) return false;
		ctx.state.tenant = tenant;
		return true;
	}
}

describe("MCP over the HTTP endpoint", () => {
	let app: Application;
	let url: string;

	beforeAll(async () => {
		@Module({
			imports: [
				McpModule.register({
					name: "notes",
					version: "1.0.0",
					decorators: [UseGuards(TenantGuard)],
				}),
				NotesModule,
			],
			providers: [TenantGuard],
		})
		class AppModule {}

		app = await Application.create(AppModule, {
			...base,
			openapi: { info: { title: "t", version: "1" } },
		});
		app.listen(0);
		url = `${app.getServer()?.url.href}mcp`;
	});

	afterAll(() => app.close());

	async function connect(headers: Record<string, string>) {
		const { Client, StreamableHTTPClientTransport } =
			await import("@modelcontextprotocol/client");
		const client = new Client({ name: "t", version: "0" });
		await client.connect(
			new StreamableHTTPClientTransport(new URL(url), {
				requestInit: { headers },
			}),
		);
		return client;
	}

	it("serves a real client, with endpoint guards filling the context", async () => {
		const client = await connect({ "x-tenant": "acme" });
		const result = await client.callTool({ name: "whoami", arguments: {} });
		expect(JSON.parse(text(result))).toMatchObject({
			transport: "http",
			tenant: "acme",
		});
		await client.close();
	});

	it("applies the endpoint's decorators as HTTP guards", async () => {
		await expect(connect({})).rejects.toThrow();
	});

	it("refuses a browser page from another origin", async () => {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				origin: "https://evil.example",
				"x-tenant": "acme",
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
		});
		expect(res.status).toBe(403);
	});

	it("keeps the endpoint out of the OpenAPI document", async () => {
		const res = await fetch(`${app.getServer()?.url.href}openapi.json`);
		const doc = (await res.json()) as { paths: Record<string, unknown> };
		expect(Object.keys(doc.paths)).not.toContain("/mcp");
	});
});

describe("McpModule options", () => {
	it("serves on a custom path, or none", async () => {
		@Module({
			imports: [
				McpModule.register({ name: "a", version: "1", path: "/ai/mcp" }),
				NotesModule,
			],
		})
		class Custom {}
		const app = await Application.create(Custom, base);
		app.listen(0);
		const root = app.getServer()?.url.href;
		const post = (path: string) =>
			fetch(`${root}${path}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
		expect((await post("mcp")).status).toBe(404);
		expect((await post("ai/mcp")).status).not.toBe(404);
		await app.close();

		@Module({
			imports: [
				McpModule.register({ name: "b", version: "1", path: false }),
				NotesModule,
			],
		})
		class StdioOnly {}
		const stdioApp = await Application.create(StdioOnly, base);
		stdioApp.listen(0);
		expect(
			(await fetch(`${stdioApp.getServer()?.url.href}mcp`, { method: "POST" }))
				.status,
		).toBe(404);
		await stdioApp.close();
	});

	it("filters the primitives per request", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				McpModule.register({
					name: "f",
					version: "1",
					filter: ({ tools }) => ({
						tools: tools.filter((tool) => tool.name !== "crashes"),
					}),
				}),
				NotesModule,
			],
		}).compile();
		const client = await connectMcpClient(moduleRef);
		const names = (await client.listTools()).tools.map((tool) => tool.name);
		expect(names).toContain("add");
		expect(names).not.toContain("crashes");
		await client.close();
		await moduleRef.close();
	});

	it("only searches the `include` modules", async () => {
		@Injectable()
		class Elsewhere {
			@Tool()
			outside() {
				return "x";
			}
		}
		@Module({ providers: [Elsewhere] })
		class OtherModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [
				McpModule.register({ name: "i", version: "1", include: [OtherModule] }),
				NotesModule,
				OtherModule,
			],
		}).compile();
		const client = await connectMcpClient(moduleRef);
		const names = (await client.listTools()).tools.map((tool) => tool.name);
		expect(names).toEqual(["outside"]);
		await client.close();
		await moduleRef.close();
	});

	it("needs a name and a version", () => {
		expect(() => McpModule.register({ name: "", version: "1" })).toThrow(
			McpError,
		);
	});
});

describe("startup checks", () => {
	async function boot(...providers: (new () => unknown)[]) {
		return Test.createTestingModule({
			imports: [McpModule.register({ name: "c", version: "1" })],
			providers,
		}).compile();
	}

	it("rejects two tools with the same name", async () => {
		@Injectable()
		class A {
			@Tool({ name: "same" })
			one() {}
		}
		@Injectable()
		class B {
			@Tool({ name: "same" })
			two() {}
		}
		await expect(boot(A, B)).rejects.toThrow(/BNS-MCP-002/);
	});

	it("rejects an invalid tool name", async () => {
		@Injectable()
		class A {
			@Tool({ name: "has spaces" })
			one() {}
		}
		await expect(boot(A)).rejects.toThrow(/not a valid tool name/);
	});

	it("rejects input that is not an object schema", async () => {
		@Injectable()
		class A {
			@Tool({ inputSchema: z.string() })
			one() {}
		}
		await expect(boot(A)).rejects.toThrow(/BNS-MCP-004/);
	});

	it("rejects scopes that nothing would check", async () => {
		@Injectable()
		class A {
			@Tool({ scopes: ["notes:write"] })
			one() {}
		}
		await expect(boot(A)).rejects.toThrow(/BNS-MCP-003/);
	});

	it("rejects two primitives on one method", () => {
		expect(() => {
			class A {
				@Tool()
				@Tool()
				one() {}
			}
			return A;
		}).toThrow(/serves one MCP primitive/);
	});

	it("lets a subclass inherit and override primitives", async () => {
		@Injectable()
		class BaseTools {
			@Tool({ description: "base" })
			shared() {
				return "base";
			}
		}
		@Injectable()
		class Child extends BaseTools {
			@Tool({ description: "child" })
			override shared() {
				return "child";
			}
		}
		const moduleRef = await boot(Child);
		const client = await connectMcpClient(moduleRef);
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.description)).toEqual(["child"]);
		expect(text(await client.callTool({ name: "shared", arguments: {} }))).toBe(
			"child",
		);
		await client.close();
		await moduleRef.close();
	});
});

describe("OpenAPI", () => {
	it("does not document the MCP endpoint", () => {
		const dynamic = McpModule.register({ name: "o", version: "1" });
		const doc = buildOpenApiDocument(dynamic.controllers ?? [], {
			title: "t",
			version: "1",
		}) as { paths: Record<string, unknown> };
		expect(doc.paths).toEqual({});
	});
});
