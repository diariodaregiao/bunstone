import type { Readable, Writable } from "node:stream";
import type { StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { McpError } from "@/errors";
import { Logger } from "@/utils/logger";
import { loadStdioSdk } from "./sdk";
import type { McpServerFactory } from "./server-factory";
import type { McpModuleOptions } from "./types";

const logger = new Logger("MCP");

export interface McpStdioListenOptions {
	/** Default `process.stdin`. */
	stdin?: Readable;
	/** Default `process.stdout`, which nothing else may write to. */
	stdout?: Writable;
}

/**
 * Serves the MCP server over stdio, for a host that launches the application
 * as a local process (Claude Desktop, an IDE, a CLI agent):
 *
 * ```ts
 * Logger.useStderr();
 * const app = await Application.create(AppModule, { logStartup: false });
 * await app.resolve(McpStdioServer).listen(); // until the client closes stdin
 * await app.close();
 * ```
 *
 * stdout carries the protocol, so the application must not write anything
 * else there: `listen()` moves Bunstone's `Logger` to stderr.
 */
export class McpStdioServer {
	private factory?: McpServerFactory;
	private handle?: StdioServerHandle;
	private onClose?: () => void;

	constructor(private readonly options: McpModuleOptions) {}

	/** Called once the SDK is loaded and the primitives are known. */
	start(factory: McpServerFactory): void {
		this.factory = factory;
	}

	/** Serves stdin and stdout; resolves when the client closes stdin or `close()` is called. */
	async listen({
		stdin = process.stdin,
		stdout = process.stdout,
	}: McpStdioListenOptions = {}): Promise<void> {
		const factory = this.factory;
		if (!factory) throw McpError.notStarted("McpStdioServer");
		if (this.handle) {
			throw McpError.invalidDefinition("McpStdioServer is already listening.");
		}
		if (stdout === process.stdout) Logger.useStderr();

		const { serveStdio, StdioServerTransport } = await loadStdioSdk();
		const closed = new Promise<void>((resolve) => {
			stdin.once("end", resolve);
			stdin.once("close", resolve);
			this.onClose = resolve;
		});
		this.handle = serveStdio(
			({ era }) => factory.create({ era, transport: "stdio" }),
			{
				transport: new StdioServerTransport(stdin, stdout),
				...(this.options.stdio?.legacy && {
					legacy: this.options.stdio.legacy,
				}),
				onerror: (error) => logger.error("MCP stdio error:", error),
			},
		);
		await closed;
		await this.close();
	}

	/** Ends the connection. */
	async close(): Promise<void> {
		const handle = this.handle;
		this.handle = undefined;
		this.onClose?.();
		await handle?.close();
	}

	onModuleDestroy(): Promise<void> {
		return this.close();
	}
}
