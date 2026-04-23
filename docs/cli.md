# CLI

Bunstone ships with a CLI focused on scaffolding, local development diagnostics, and production builds.

## Commands

### `bunstone new <project-name>`

Creates a new project from the bundled starter and runs `bun install`.

```bash
bunx @grupodiariodaregiao/bunstone new my-app
```

You can also use the shorthand:

```bash
bunx @grupodiariodaregiao/bunstone my-app
```

### `bunstone run [bun-flags] <entrypoint>`

Runs a Bun entrypoint and enhances import error messages with Bunstone export hints.

```bash
bunstone run src/main.ts
bunstone run --watch src/main.ts
```

Use this when you want Bun's normal runtime plus better diagnostics for invalid Bunstone imports.

### `bunstone build [entry] [options]`

Bundles the app entrypoint and, when available, bundles React views for SSR hydration.

```bash
bunstone build src/main.ts
```

#### Build options

- `--views <dir>`: directory containing React views. Default: `src/views`
- `--out <dir>`: build output directory. Default: `dist`
- `--compile`: compile to a standalone binary
- `--no-bundle`: skip the app bundle and only generate view bundles

Examples:

```bash
bunstone build src/main.ts --out build
bunstone build --compile
bunstone build --views src/views --no-bundle
```

If no entrypoint is provided, the CLI tries these files in order:

- `src/index.ts`
- `index.ts`
- `src/main.ts`
- `main.ts`

### `bunstone exports`

Prints public runtime exports and type-only exports from the package.

```bash
bunstone exports
```

Useful when:

- checking the correct name of a decorator or module
- confirming whether a symbol must be imported with `import type`
- debugging `Export named 'X' not found` errors

## Recommended Workflow

```bash
bunx @grupodiariodaregiao/bunstone new my-app
cd my-app
bunstone run --watch src/main.ts
```

For production builds:

```bash
bunstone build src/main.ts --out dist
```
