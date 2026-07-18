# CLI

Bunstone ships a CLI for scaffolding projects, running and building apps, generating boilerplate, and inspecting the public API. Invoke it with `bunx`:

```bash
bunx bunstone <command>
```

## Commands

### `bunstone new <name>`

Scaffolds a new project with `src/main.ts`, `src/app.module.ts`, and `src/app.controller.ts`.

```bash
bunx bunstone new my-app
cd my-app && bun install && bun run dev
```

### `bunstone run <entry>`

Runs an entrypoint with Bun. Extra Bun flags are forwarded.

```bash
bunx bunstone run src/main.ts
bunx bunstone run --watch src/main.ts
```

### `bunstone build [entry]`

Bundles the app to `dist/` (targeting Bun, minified). Defaults to `src/main.ts` when no entry is given.

```bash
bunx bunstone build
bunx bunstone build src/main.ts
```

### `bunstone generate <kind> <name>` (alias `g`)

Generates a `controller`, `service`, or `module` from a template. The file name is derived in kebab-case and the class in PascalCase.

```bash
bunx bunstone generate controller users   # → users.controller.ts (UsersController)
bunx bunstone g service users             # → users.service.ts (UsersService)
bunx bunstone g module users              # → users.module.ts (UsersModule)
```

### `bunstone exports`

Lists every public export from the package, one per line. Useful for confirming the exact name of a decorator, class, or type.

```bash
bunx bunstone exports
```
