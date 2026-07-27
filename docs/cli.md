# CLI

Bunstone ships a CLI for scaffolding projects, running and building apps, generating boilerplate, and inspecting the public API. Invoke it with `bunx`:

```bash
bunx @grupodiariodaregiao/bunstone <command>
```

## Commands

### `bunstone new <name>`

Scaffolds a new project with `src/main.ts`, `src/app.module.ts`, and `src/app.controller.ts`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app && bun install && bun run dev
```

Scaffolding into a directory that already has files is refused, so a typo cannot overwrite an existing project. Pass `--force` to overwrite deliberately.

### `bunstone run <entry>`

Runs an entrypoint with Bun. Extra Bun flags are forwarded.

```bash
bunx @grupodiariodaregiao/bunstone run src/main.ts
bunx @grupodiariodaregiao/bunstone run --watch src/main.ts
```

### `bunstone build [entry]`

Bundles the app to `dist/` (targeting Bun, minified). Defaults to `src/main.ts` when no entry is given.

```bash
bunx @grupodiariodaregiao/bunstone build
bunx @grupodiariodaregiao/bunstone build src/main.ts
```

### `bunstone generate <kind> <name>` (alias `g`)

Generates a `controller`, `service`, or `module` from a template. The file name is derived in kebab-case and the class in PascalCase.

```bash
bunx @grupodiariodaregiao/bunstone generate controller users   # → users.controller.ts (UsersController)
bunx @grupodiariodaregiao/bunstone g service users             # → users.service.ts (UsersService)
bunx @grupodiariodaregiao/bunstone g module users              # → users.module.ts (UsersModule)
```

An existing file is never overwritten silently — the command refuses and tells you to re-run with `--force`. An unrecognised kind prints the usage line instead of failing with a stack trace.

### `bunstone exports`

Lists every public export from the package, one per line. Useful for confirming the exact name of a decorator, class, or type.

```bash
bunx @grupodiariodaregiao/bunstone exports
```
