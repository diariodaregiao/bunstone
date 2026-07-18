const PACKAGE = "@grupodiariodaregiao/bunstone";

export function projectAgentsMd(): string {
	return `# AGENTS.md

This project is built with **Bunstone** — a decorator-based framework for Bun
(dependency injection, HTTP, CQRS + event sourcing, RabbitMQ, scheduling, SSE &
WebSocket, observability), built entirely on native Bun APIs.

## Bunstone documentation

The complete Bunstone documentation ships inside the installed package. Read it
from \`node_modules\` before writing Bunstone code:

- **Full reference (single file, everything embedded):** \`node_modules/${PACKAGE}/AGENTS.md\`
- **Machine-readable index:** \`node_modules/${PACKAGE}/llms.txt\`
- **Guides (one per feature):** \`node_modules/${PACKAGE}/docs/\`
- **Runnable examples:** \`node_modules/${PACKAGE}/examples/\`
- **List every public export:** run \`bunx bunstone exports\`

## Project conventions

- Bootstrap in \`src/main.ts\` with \`Application.create(AppModule)\` then \`app.listen(port)\`.
- The entry file must start with \`import "reflect-metadata"\`.
- Import everything from \`${PACKAGE}\`.
- Group features into modules with \`@Module({ controllers, providers, imports })\`.

## Quick reference

\`\`\`ts
import {
  Application, Module, Injectable, Controller,
  Get, Post, Param, Query, Body,
} from "${PACKAGE}";

@Injectable()
class GreetService {
  greet(name: string) {
    return \`hello \${name}\`;
  }
}

@Controller("users")
class UsersController {
  constructor(private readonly greet: GreetService) {}

  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id, message: this.greet.greet(id) };
  }
}

@Module({ controllers: [UsersController], providers: [GreetService] })
class AppModule {}

const app = await Application.create(AppModule);
app.listen(3000);
\`\`\`

For anything beyond this, open the docs listed above — they cover every module,
decorator and option in detail.
`;
}
