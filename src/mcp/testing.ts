import type { Client } from "@modelcontextprotocol/client";
import type { Container } from "@/core/container";
import { optionalImport } from "@/utils/optional-import";
import { McpHttpService } from "./http";

export interface ConnectMcpClientOptions {
	/**
	 * `'modern'` (default) connects with revision 2026-07-28, `'legacy'` with
	 * the 2025 `initialize` handshake.
	 */
	era?: "modern" | "legacy";
	/** Sent as `Authorization: Bearer <token>` (with the module's `auth` option). */
	token?: string;
	/** Headers sent with every request. */
	headers?: Record<string, string>;
	/** Default `{ name: "bunstone-mcp-testing", version: "0.0.0" }`. */
	clientInfo?: { name: string; version: string };
}

/**
 * An MCP client connected in memory to the application's MCP server, through
 * the same handler the HTTP endpoint uses (Host and Origin checks, the OAuth
 * gate, guards on every primitive), with no socket. Guards on the endpoint's
 * route do not run. Needs `@modelcontextprotocol/client`; close the client
 * when done.
 *
 * ```ts
 * const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
 * const client = await connectMcpClient(moduleRef);
 * const result = await client.callTool({ name: "add", arguments: { text: "Buy milk" } });
 * await client.close();
 * ```
 */
export async function connectMcpClient(
	app: { readonly container: Container },
	{
		era = "modern",
		token,
		headers = {},
		clientInfo = { name: "bunstone-mcp-testing", version: "0.0.0" },
	}: ConnectMcpClientOptions = {},
): Promise<Client> {
	const { Client, StreamableHTTPClientTransport } = await optionalImport(
		() => import("@modelcontextprotocol/client"),
		"@modelcontextprotocol/client",
		"connectMcpClient()",
	);
	const http = app.container.resolve(McpHttpService);

	const transport = new StreamableHTTPClientTransport(
		new URL("http://localhost/mcp"),
		{
			fetch: (input, init) => {
				const request = new Request(input as string, init);
				// a socket would send it, and `http.allowedHosts` checks it
				if (!request.headers.has("host")) {
					request.headers.set("host", new URL(request.url).host);
				}
				return http.fetch(request);
			},
			requestInit: {
				headers: {
					...headers,
					...(token && { authorization: `Bearer ${token}` }),
				},
			},
		},
	);
	const client = new Client(
		clientInfo,
		era === "modern"
			? { versionNegotiation: { mode: { pin: "2026-07-28" } } }
			: {},
	);
	await client.connect(transport);
	return client;
}
