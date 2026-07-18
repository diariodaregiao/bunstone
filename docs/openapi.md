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
}
```

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

## Schemas from Zod

When you pass a Zod schema to `@Body(schema)`, Bunstone converts it with `z.toJSONSchema` and emits it as the operation's `requestBody` schema. Path parameters are documented automatically, and `@Query("name")` parameters appear as query parameters.

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
