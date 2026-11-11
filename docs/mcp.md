# MCP (Model Context Protocol)

`McpModule` turns a Bunstone application into a [Model Context Protocol](https://modelcontextprotocol.io) server, so AI assistants (Claude, IDE agents, CLI agents) can call into it. Methods on your providers become MCP **tools**, **resources** and **prompts**, each declared with a decorator — the same model as [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview), built into Bunstone instead of installed separately.

It is built on the official MCP TypeScript SDK (`@modelcontextprotocol/server`), which ships with Bunstone. The SDK speaks web-standard `Request`/`Response`, exactly what `Bun.serve` hands out, so nothing is converted on the way.

MCP lives in its own entry point, `@grupodiariodaregiao/bunstone/mcp`. It is installed with Bunstone, but a production bundle only includes it (and the SDK, ~350 KB) when the app imports from `/mcp`: an app without MCP pays nothing for it, in bundle size or startup time.

## Quick start

```ts
import "reflect-metadata";
import { z } from "zod";
import { Application, Injectable, Module } from "@grupodiariodaregiao/bunstone";
import { McpModule, Tool } from "@grupodiariodaregiao/bunstone/mcp";

@Injectable()
export class NotesTools {
  constructor(private readonly notes: NotesService) {}

  @Tool({
    description: "Save a note and return it",
    inputSchema: z.object({ text: z.string().min(1).describe("The text of the note") }),
  })
  add({ text }: { text: string }) {
    return this.notes.add(text);
  }
}

@Module({
  imports: [
    McpModule.register({
      name: "notes",
      version: "1.0.0",
      instructions: "Use these tools to read and write the user's notes.",
    }),
  ],
  providers: [NotesService, NotesTools],
})
export class AppModule {}

const app = await Application.create(AppModule);
app.listen(3000); // MCP served at http://localhost:3000/mcp
```

Point an MCP client at `http://localhost:3000/mcp`, or launch it over [stdio](#stdio).

At startup Bunstone finds every decorated method on your providers (no extra registration), checks it, and serves it. A problem — two tools with the same name, an invalid name, an input schema that is not an object — fails `Application.create`, not the first call.

## Imports

| From | What |
|---|---|
| `@grupodiariodaregiao/bunstone/mcp` | `McpModule`, `Tool`, `Resource`, `ResourceTemplate`, `Prompt`, `McpStdioServer`, `McpHttpService`, `McpRegistry`, and the types (`McpContext`, `McpGuard`, `McpTokenVerifier`, `AuthInfo`, …) |
| `@grupodiariodaregiao/bunstone/mcp/testing` | `connectMcpClient` |
| `@grupodiariodaregiao/bunstone` | everything else: `UseGuards`, the exceptions, `Logger`, `McpError` |

## Tools

A tool is something the model can **do**. The method is called as `(input, context)`: `input` is the arguments, already validated against `inputSchema`, and `context` is the [`McpContext`](#the-context).

```ts
@Tool({
  description: "Find the notes containing a text",
  inputSchema: z.object({ query: z.string().describe("Text to look for") }),
  outputSchema: z.object({ notes: z.array(Note) }),
  annotations: { readOnlyHint: true },
})
search({ query }: { query: string }) {
  return { notes: this.notes.search(query) };
}
```

| Option | Meaning |
|---|---|
| `name` | Defaults to the method name. 1–128 characters of `A-Z a-z 0-9 _ - .` |
| `description` | What it does. The model reads it to decide when to call the tool — write it well |
| `inputSchema` | Zod object schema of the arguments. Invalid input never reaches the method |
| `outputSchema` | Schema of the structured result, validated before it is sent |
| `annotations` | Hints: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` |
| `title`, `icons`, `_meta` | Display metadata |
| `scopes` | OAuth scopes the caller's token must carry (see [Authorization](#authorization)) |

What the method returns becomes the result:

- a **string** → a text result;
- **any other value** → its JSON as text, and as `structuredContent` when there is an `outputSchema`;
- **nothing** → an empty result;
- a `CallToolResult` (`{ content: [...] }`) → sent as it is.

### Errors

A tool's failure is reported to the **model**, as a result with `isError: true`, so it can recover:

- an `HttpException` (`BadRequestException`, `NotFoundException`, …) → its message;
- any other error → `Internal server error`, and the real error is logged. Internal details never reach the client.

```ts
@Tool({ inputSchema: z.object({ id: z.string() }) })
cancel({ id }: { id: string }) {
  const order = this.orders.find(id);
  if (!order) throw new NotFoundException(`There is no order ${id}`);
  if (order.shipped) throw new ConflictException("The order has already shipped.");
  return this.orders.cancel(id);
}
```

### Progress and cancellation

```ts
@Tool({ inputSchema: z.object({ files: z.array(z.string()) }) })
async index({ files }: { files: string[] }, ctx: McpContext) {
  for (const [i, file] of files.entries()) {
    if (ctx.signal.aborted) break;           // the client cancelled
    await this.indexer.index(file, { signal: ctx.signal });
    await ctx.reportProgress(i + 1, files.length, file);
  }
  return `Indexed ${files.length} files`;
}
```

`reportProgress` does nothing when the client did not ask for progress. On HTTP the response is upgraded to a stream when progress is sent.

## Resources

A resource is something the model can **read**, at a URI.

```ts
@Resource({ uri: "config://app", mimeType: "application/json", description: "Public settings" })
config() {
  return this.settings.public();
}
```

A **resource template** serves a family of URIs; the method receives the template's variables:

```ts
@ResourceTemplate({ uriTemplate: "notes://{id}", mimeType: "text/plain" })
note({ id }: { id: string }) {
  const note = this.notes.find(id);
  if (!note) throw new NotFoundException(`There is no note ${id}`); // → resource not found
  return note.text;
}
```

A resource returns a string (text of `mimeType`), bytes (a `Uint8Array`, sent as a base64 blob), any other value (JSON) or a `ReadResourceResult`. A `NotFoundException` answers with the spec's resource-not-found error; a `BadRequestException` with invalid params.

## Prompts

A prompt is a reusable message template the user picks in the client.

```ts
@Prompt({
  description: "Summarize the notes",
  argsSchema: z.object({ style: z.enum(["bullets", "paragraph"]).describe("Shape of the summary") }),
})
summarize({ style }: { style: "bullets" | "paragraph" }) {
  return `Summarize these notes as ${style}:\n\n${this.notes.dump()}`;
}
```

It returns a string (one user message), an array of prompt messages, or a `GetPromptResult`.

## The context

The second argument of every MCP method:

| Field | Meaning |
|---|---|
| `kind`, `name`, `uri` | What is being called |
| `transport` | `"http"` or `"stdio"` |
| `era` | `"modern"` (protocol revision 2026-07-28) or `"legacy"` (2025 revisions) |
| `authInfo` | The verified access token, with [`auth`](#authorization) |
| `http` | Bunstone's `RequestContext` of the HTTP request: headers, cookies, and the `state` that endpoint guards filled in |
| `request` | The web-standard `Request` |
| `signal` | Aborted when the client cancels or disconnects — pass it on to your own I/O |
| `reportProgress()` | Sends a progress notification |
| `server` | The SDK's request context, for anything without a shortcut here |

## Guards

`@UseGuards()` works on MCP providers and methods, as on controllers. An MCP guard implements `McpGuard` and receives the `McpContext`; returning `false` answers `Forbidden`.

```ts
@Injectable()
export class ReadOnlyGuard implements McpGuard {
  canActivate(ctx: McpContext) {
    return ctx.name.startsWith("get") || ctx.name.startsWith("search");
  }
}

@Injectable()
@UseGuards(ReadOnlyGuard)
export class NotesTools { /* ... */ }
```

Register the guard in a module's `providers`, like any guard.

### Protecting the HTTP endpoint

The `/mcp` endpoint is an ordinary controller, so **CORS, rate limiting and HTTP guards** apply to it. Pass class decorators in `decorators`:

```ts
McpModule.register({
  name: "notes",
  version: "1.0.0",
  decorators: [Jwt(), RateLimit({ max: 60, windowMs: 60_000 })],
});
```

What an HTTP guard stores reaches the tools through `ctx.http.state` — with `@Jwt()`, the verified payload is at `ctx.http.state.jwt`:

```ts
@Tool()
myNotes(_input: unknown, ctx: McpContext) {
  const { sub } = ctx.http?.state.jwt as { sub: string };
  return this.notes.forUser(sub);
}
```

## Authorization

For clients that follow the MCP authorization spec (OAuth 2.1), make the server an OAuth **resource server**: every request must carry an access token issued for it.

```ts
@Injectable()
export class TokenVerifier implements McpTokenVerifier {
  constructor(private readonly jwt: JwtService) {}

  async verifyAccessToken(token: string): Promise<AuthInfo | null> {
    const claims = await this.jwt.verify<{ sub: string; scope?: string; exp: number; aud: string }>(token);
    if (!claims) return null;                      // → 401 with a WWW-Authenticate challenge
    return {
      token,
      clientId: claims.sub,
      scopes: claims.scope?.split(" ") ?? [],
      expiresAt: claims.exp,                       // required
      resource: new URL(claims.aud),
    };
  }
}

McpModule.register({
  name: "notes",
  version: "1.0.0",
  auth: {
    verifier: TokenVerifier,                       // resolved through DI
    resource: "https://api.example.com/mcp",       // this server's canonical URL
    authorizationServers: ["https://auth.example.com"],
    scopesSupported: ["notes:read", "notes:write"],
  },
});
```

- A request without a valid token gets `401` and a `WWW-Authenticate` challenge pointing at the **protected resource metadata** (RFC 9728), which Bunstone serves at `/.well-known/oauth-protected-resource/mcp`.
- The token's audience must be `resource` (RFC 8707).
- `scopes` on a tool, resource or prompt require those scopes: a token without them gets `403 insufficient_scope`, so the client can ask the user for more (step-up authorization).
- `requiredScopes` lists scopes every request needs.

Declaring `scopes` without `auth` fails at startup (`BNS-MCP-003`): nothing would check them.

## Transports

### Streamable HTTP

Served at `/mcp` by default, next to your routes. Each request is served **statelessly**, so it works behind any load balancer and with any number of replicas. Both the 2026-07-28 protocol revision and 2025-era clients are served.

### stdio

For hosts that launch the application as a local process (Claude Desktop, Claude Code, IDEs). Create the application without listening, and serve stdin/stdout:

```ts
// src/stdio.ts
import "reflect-metadata";
import { Application, Logger } from "@grupodiariodaregiao/bunstone";
import { McpStdioServer } from "@grupodiariodaregiao/bunstone/mcp";
import { AppModule } from "./app.module";

Logger.useStderr(); // stdout carries the protocol: keep logs off it

const app = await Application.create(AppModule, { logStartup: false });
await app.resolve(McpStdioServer).listen(); // until the client disconnects
await app.close();
```

```json
{
  "mcpServers": {
    "notes": { "command": "bun", "args": ["/path/to/app/src/stdio.ts"] }
  }
}
```

Anything written to stdout corrupts the stream. `listen()` moves Bunstone's `Logger` to stderr; calling `Logger.useStderr()` first covers logs written during startup too. Avoid `console.log` in code that runs under stdio.

Set `path: false` for an application that only serves stdio. Combined with [`bunstone build --compile`](./cli.md), the server ships as a single executable.

## Module options

| Option | Meaning |
|---|---|
| `name`, `version` | Required. Reported to clients |
| `title`, `description`, `websiteUrl`, `icons` | Display metadata |
| `instructions` | Guidance for the model on how to use the server |
| `include` | Modules searched for primitives. Default: all |
| `path` | HTTP route. Default `"/mcp"`; `false` disables it |
| `decorators` | Class decorators for the endpoint's controller (guards, rate limit) |
| `imports` | Modules whose exports a `verifier` class injects |
| `filter` | Picks the primitives a request or connection is served (feature flags, tenants) |
| `http.idleTimeout` | Idle limit for MCP requests, in ms. Default `120000` — tools calling slow services outlast the app's 10 s default. `0` disables it |
| `http.responseMode` | `"auto"` (default), `"json"` or `"sse"` |
| `http.legacy` | `"stateless"` (default) serves 2025-era clients; `"reject"` serves 2026-07-28 only |
| `http.allowedOrigins` | Origins a browser page may call from. Default: localhost only; `false` disables the check |
| `http.allowedHosts` | `Host` header allowlist, against DNS rebinding. Not checked unless set |
| `http.maxRequestBodySize` | Default 4 MiB |
| `auth` | See [Authorization](#authorization) |
| `stdio.legacy` | `"serve"` (default) or `"reject"` 2025-era connections |

### Filtering per request

```ts
McpModule.register({
  name: "notes",
  version: "1.0.0",
  filter: ({ tools }, { authInfo }) => ({
    tools: authInfo?.scopes.includes("admin") ? tools : tools.filter((t) => !t.name.startsWith("admin_")),
  }),
});
```

A primitive left out is neither listed nor callable for that request. Prefer `scopes` when the client can ask for more access; use `filter` to hide things outright.

## Testing

`connectMcpClient()` connects an MCP client to the application **in memory**, through the same handler the endpoint uses. It lives in `@grupodiariodaregiao/bunstone/mcp/testing`, so production bundles never reach it, and needs the SDK client, an optional peer dependency:

```bash
bun add -d @modelcontextprotocol/client
```

```ts
import { Test } from "@grupodiariodaregiao/bunstone";
import { connectMcpClient } from "@grupodiariodaregiao/bunstone/mcp/testing";

const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
const client = await connectMcpClient(moduleRef);

const result = await client.callTool({ name: "add", arguments: { text: "Buy milk" } });
expect(result.structuredContent).toEqual({ id: "1", text: "Buy milk" });

await client.close();
await moduleRef.close();
```

Options: `era` (`"modern"` default, or `"legacy"`), `token` (sent as a bearer token), `headers`. Guards on the endpoint's route (`decorators`) do not run in memory; guards on providers do.

## Observability

With [`TelemetryModule`](./observability.md), every call gets a span (`tools/call add`, `resources/read notes://{id}`, `prompts/get summarize`) nested under its HTTP request, and an `mcp.server.operation.duration` histogram by operation, name and outcome.
