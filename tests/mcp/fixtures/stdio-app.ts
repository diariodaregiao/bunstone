/**
 * An MCP server over stdio, as a host such as Claude Desktop launches it:
 * `bun tests/mcp/fixtures/stdio-app.ts`.
 */
import "reflect-metadata";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { McpModule } from "@/mcp/mcp-module";
import { McpStdioServer } from "@/mcp/stdio";
import { Logger } from "@/utils/logger";
import { NotesModule } from "./notes";

Logger.useStderr();

@Module({
	imports: [
		McpModule.register({ name: "notes-stdio", version: "1.0.0", path: false }),
		NotesModule,
	],
})
class AppModule {}

const app = await Application.create(AppModule, { logStartup: false });
// a log line on stdout would corrupt the protocol stream
new Logger("Fixture").info("started");
await app.resolve(McpStdioServer).listen();
await app.close();
