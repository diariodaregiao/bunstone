# OpenAPI (Swagger)

Bunstone can generate an OpenAPI 3.1 document from your controllers and serve it, optionally alongside a Swagger UI page. Enrich the document with decorators.

## Enabling

Pass the `openapi` option to `Application.create`. The document is served at `/openapi.json`; set `ui: true` to also serve Swagger UI at `/docs`.

```ts
import "reflect-metadata";
import { Application } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
  },
});

app.listen(3000);
```

### Options

```ts
interface OpenApiServeOptions {
  info: { title: string; version: string; description?: string };
  ui?: boolean;      // serve Swagger UI (default: off)
  path?: string;     // spec path (default: "/openapi.json")
  uiPath?: string;   // UI path (default: "/docs")
  auth?: {
    username: string;
    password: string;
    realm?: string;
  };
  bearer?: boolean | {
    name?: string;
    description?: string;
    bearerFormat?: string;
  };
}
```

### Bearer auth (Swagger Authorize)

Pass `bearer: true` to add an HTTP Bearer security scheme to the OpenAPI document and require it on every documented route. Swagger UI shows an **Authorize** button where you enter the token once; all **Try it out** requests then send `Authorization: Bearer <token>`.

```ts
const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
    bearer: true,
  },
});
```

You can customize the scheme:

```ts
bearer: {
  description: "Paste your API token",
  bearerFormat: "token",
}
```

Enter the token **without** the `Bearer ` prefix — Swagger UI adds it automatically.

For mixed APIs (some routes public, some protected), omit global `bearer` and mark protected controllers or handlers with `@ApiBearerAuth()`:

```ts
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {}
```

This is independent of `openapi.auth`, which protects access to `/docs` and `/openapi.json` with HTTP Basic Auth.

### Protecting the docs

By default `/openapi.json` and `/docs` are public. Pass `auth` to require HTTP Basic Auth on both routes:

```ts
const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
    auth: {
      username: process.env.DOCS_USER ?? "admin",
      password: process.env.DOCS_PASSWORD ?? "secret",
    },
  },
});
```

Unauthenticated requests receive `401` with a `WWW-Authenticate: Basic` challenge (the browser shows a login prompt for `/docs`). The same credentials are required for `/openapi.json`, so the Swagger UI can load the spec after you sign in.

## Decorators

Annotate controllers and handlers to describe operations.

```ts
import { z } from "zod";
import { Controller, Get, Post, Body, Param, Query } from "@grupodiariodaregiao/bunstone";
import { ApiTags, ApiOperation, ApiResponse } from "@grupodiariodaregiao/bunstone";

const CreateUser = z.object({ name: z.string().min(2), age: z.number() });

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get(":id")
  @ApiOperation({ summary: "Get a user" })
  @ApiResponse({ status: 200, description: "found" })
  @ApiResponse({ status: 404, description: "missing" })
  one(@Param("id") id: string, @Query("expand") expand?: string) {
    return { id, expand };
  }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
    return body;
  }
}
```

- `@ApiTags(...tags)` — tags for a controller or a specific method; both are merged into the operation.
- `@ApiOperation({ summary, description })` — describes the endpoint.
- `@ApiResponse({ status, description })` — documents a response; repeat it for multiple statuses.
- `@ApiBearerAuth()` — marks a controller or handler as requiring Bearer auth in the OpenAPI document (use with `openapi.bearer` off for mixed public/protected APIs).

## Schemas from Zod

When you pass a Zod schema to `@Body(schema)`, Bunstone converts it with `z.toJSONSchema` and emits it as the operation's `requestBody` schema. Path parameters are documented automatically — including those declared on the `@Controller` prefix — and `@Query("name")` parameters appear as query parameters.

Some Zod types have no JSON Schema equivalent (`z.date()`, `z.bigint()`, `z.custom()`, `.transform()`). These are emitted as permissive schemas rather than failing: document generation can never stop your application from booting. When a schema cannot be represented, a warning naming the route is logged.

A self-referencing schema (a category with children of its own type, for example) is hoisted into `components.schemas` and referenced from there, so its internal `$ref` resolves to the schema rather than to the root of the document.

The Swagger UI page loads swagger-ui-dist from a CDN at an exact pinned version, locked with a subresource-integrity hash, so a compromised or altered CDN asset cannot execute on your API's origin.

For the controller above, the generated document includes:

```json
{
  "openapi": "3.1.0",
  "paths": {
    "/users/{id}": {
      "get": {
        "summary": "Get a user",
        "tags": ["Users"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "expand", "in": "query", "required": false, "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "found" }, "404": { "description": "missing" } }
      }
    },
    "/users": {
      "post": {
        "summary": "Create a user",
        "requestBody": {
          "required": true,
          "content": { "application/json": { "schema": { "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "number" } }, "required": ["name", "age"] } } }
        }
      }
    }
  }
}
```
