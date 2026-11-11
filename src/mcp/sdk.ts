import { McpError } from "@/errors";

export type ServerSdk = typeof import("@modelcontextprotocol/server");
export type StdioSdk = typeof import("@modelcontextprotocol/server/stdio");

let server: ServerSdk | undefined;

/**
 * The MCP SDK costs ~40 ms to import, so it is loaded the first time an
 * application that registers `McpModule` starts, and never otherwise.
 */
export async function loadServerSdk(): Promise<ServerSdk> {
	server ??= await import("@modelcontextprotocol/server");
	return server;
}

export function serverSdk(): ServerSdk {
	if (!server) throw McpError.notStarted("The MCP SDK");
	return server;
}

export function loadStdioSdk(): Promise<StdioSdk> {
	return import("@modelcontextprotocol/server/stdio");
}
