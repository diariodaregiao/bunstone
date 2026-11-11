# Configuration

`defineConfig` validates the environment against a schema and returns a frozen, typed object. `ConfigModule` makes that object injectable. Bun already loads `.env` files, so there is no dotenv step and no extra dependency.

## Setup

```ts
// src/config.ts
import { z } from "zod";
import { defineConfig } from "@grupodiariodaregiao/bunstone";

const Env = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().default(3000),
  JWT_SECRET: z.string().min(32),
});

export const config = defineConfig(Env);
export type AppConfig = typeof config;
```

```ts
// src/app.module.ts
import { ConfigModule, JwtModule, Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { config } from "./config";

@Module({
  imports: [
    ConfigModule.register(config),
    SqlModule.register(config.DATABASE_URL),
    JwtModule.register({ secret: config.JWT_SECRET }),
  ],
})
export class AppModule {}
```

```ts
// src/main.ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";
import { config } from "./config";

const app = await Application.create(AppModule);
app.listen(config.PORT);
```

`defineConfig(schema)`:

- reads `Bun.env` **when it is called**, never when Bunstone is imported;
- validates **synchronously** and throws a single `ConfigurationError` (`BNS-CFG-006`) listing every invalid or missing variable;
- returns the parsed value — coerced, with defaults applied, undeclared variables dropped — **deeply frozen** and typed as the schema's output.

Calling it at the top level of a module, as above, means a bad environment stops the process while the modules are being imported, before any connection is opened or a port is bound.

## Synchronous on purpose

Because the result is an ordinary value, it can be passed straight into any other module's `register(...)` call, as `SqlModule` and `JwtModule` above show. That covers what NestJS needs `forRootAsync` and `ConfigService` injection into factories for: Bunstone has no async modules, and with configuration available before the module graph is declared, it does not need them.

A schema that only validates asynchronously (an `async` refinement, for example) is rejected with `BNS-CFG-006`. Checks that need I/O — "is the database reachable" — belong in `onModuleInit` or a [readiness check](./deployment.md), not in the configuration schema.

## Schema patterns

Every environment variable is a string, so anything else has to be parsed from one.

```ts
const Env = z.object({
  // numbers
  PORT: z.coerce.number().int().positive().default(3000),
  POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),

  // booleans: "true"/"false", "1"/"0", "yes"/"no", "on"/"off"
  DEBUG: z.stringbool().default(false),

  // URLs and other formats
  DATABASE_URL: z.url(),
  ADMIN_EMAIL: z.email(),

  // a fixed set of values, typed as a union
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // optional: `string | undefined`
  SENTRY_DSN: z.url().optional(),

  // derived values
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").filter(Boolean)),
});
```

- **Never use `z.coerce.boolean()`.** It is JavaScript truthiness: `"false"` and `"0"` both become `true`. Use `z.stringbool()`.
- **An empty value is a string, not a missing one.** `PORT=` in a `.env` file is `""`, which `z.coerce.number()` turns into `0` and `.default()` does not replace. Add `.positive()` (or `.min(1)`) where `0` makes no sense, so the mistake is reported instead of used.
- **`.default()` belongs to values with a safe default.** A secret or a connection string with a default is a production incident waiting for a forgotten variable; leave those required.

Any schema that implements [Standard Schema](https://standardschema.dev) works — Zod 4, Valibot, ArkType. The examples use Zod, which Bunstone already depends on.

## `.env` files

Bun loads these files from the directory the process **starts in**, before any of your code runs, in increasing order of precedence:

1. `.env`
2. `.env.production`, `.env.development` or `.env.test`, following `NODE_ENV`
3. `.env.local` — **not loaded when `NODE_ENV=test`**
4. `.env.production.local`, `.env.development.local` or `.env.test.local`, following `NODE_ENV`

A variable already set in the process environment — by the shell, Docker, Kubernetes, CI — is never overridden by a file. `bun test` sets `NODE_ENV=test`, so tests read `.env.test` and skip `.env.local`.

To pick the files yourself, use `bun --env-file=.env.staging src/main.ts`; to disable loading altogether, `bun --no-env-file` or `env = false` in `bunfig.toml`. A bundle built with `bunstone build` reads its environment when it runs, not when it is built: `bun dist/main.js` loads the `.env` files of the directory it is started from.

In production, prefer real environment variables (or your orchestrator's secrets) over a `.env` file baked into an image.

## Injection

`ConfigModule.register(config)` is a **global** module: the config is injectable everywhere under the `CONFIG` token, without importing the module again.

```ts
import { CONFIG, Inject, Injectable } from "@grupodiariodaregiao/bunstone";
import type { AppConfig } from "./config";

@Injectable()
export class MailService {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  sender() {
    return this.config.ADMIN_EMAIL;
  }
}
```

Type the parameter with `typeof config` (exported above as `AppConfig`) or, from the schema, `InferConfig<typeof Env>`. Both are the frozen output type: every property is `readonly`, nested ones included.

Importing `config` directly works too, and is what module `register(...)` calls do. Injecting it is what lets a test replace it.

## Testing

`defineConfig` takes an optional source, which a test can use to validate a known environment instead of the process one:

```ts
const config = defineConfig(Env, {
  env: { DATABASE_URL: "postgres://localhost/test", JWT_SECRET: "x".repeat(32) },
});
```

To replace the config of an application under test, override the token:

```ts
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(CONFIG)
  .useValue(defineConfig(Env, { env: { ...testEnv, PORT: "0" } }))
  .compile();
```

`overrideProvider` replaces what is injected. Values that `app.module.ts` already passed to other modules' `register(...)` calls were read when the file was imported, so for those, set the variables in `.env.test` — which `bun test` loads — rather than overriding the token.

## Errors

Every problem is reported at once, so a deploy fails with the whole list instead of one variable per attempt:

```
ConfigurationError: Invalid configuration: 3 environment variables failed validation. [BNS-CFG-006]

  - DATABASE_URL: missing
  - PORT: Invalid input: expected number, received NaN
  - JWT_SECRET: Too small: expected string to have >=32 characters
  Set them in the environment or in a .env file in the directory the process starts in.
```

The error names variables, never their values: an invalid `JWT_SECRET` must not end up in a log aggregator. Zod's default messages do not echo the value they reject; if a custom message does, the value of every rejected variable (4 characters or longer) is replaced with `[redacted]` before the error is built. The underlying validation error is not attached as `cause`, since it may carry the input. `error.context.variables` lists the variable names, for matching or alerting.

## What is deliberately not here

- **A `ConfigService` with `get("KEY")`.** The config object is already typed; `config.PORT` is shorter and checked by the compiler.
- **Namespaced configuration** (`defineConfig({ db: DbSchema, http: HttpSchema })` reading prefixed variables). Group values with a `.transform()` on the schema. Several `defineConfig` calls with several schemas also work, but only one config is registered under `CONFIG`; import the others directly.
- **Async loading** from a secrets manager. Fetch the secrets first with a top-level `await` and pass them in the source: `defineConfig(Env, { env: { ...Bun.env, ...(await loadSecrets()) } })`.
