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
- `@ApiResponse({ status, description, schema?, example?, examples?, contentType? })` — documents a response; repeat it for multiple statuses. See [Response payloads](#response-payloads).
- `@Returns(schema, options?)` — types the handler's return value, documents it as the response body and parses it at runtime. See [Typed responses with `@Returns`](#typed-responses-with-returns).
- `@ApiBearerAuth()` — marks a controller or handler as requiring Bearer auth in the OpenAPI document (use with `openapi.bearer` off for mixed public/protected APIs).

## Schemas from Zod

When you pass a Zod schema to `@Body(schema)`, Bunstone converts it with `z.toJSONSchema` and emits it as the operation's `requestBody` schema. A Zod schema passed to `@ApiResponse({ schema })` becomes that response's body schema (see [Response payloads](#response-payloads)). `@FormData({ fields, files })` is documented as a `multipart/form-data` body (see [File uploads](#file-uploads-multipartform-data)). Path parameters are documented automatically — including those declared on the `@Controller` prefix — and `@Query("name")` parameters appear as query parameters.

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

## Typed responses with `@Returns`

`@Returns(schema)` declares a route's response body with a Zod schema, all in one place:

- **Typing:** the handler must return what the schema describes. A mismatch is a compile error on the decorator.
- **Documentation:** the schema is documented as the response payload, under `200` by default.
- **Runtime:** the returned value is parsed by the schema before it is sent, so the client receives exactly what the document says.

```ts
import { z } from "zod";
import { Controller, Get, Post, Returns } from "@grupodiariodaregiao/bunstone";

const User = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["admin", "user"]).default("user"),
});

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get(":id")
  @Returns(User, { example: { id: "1", name: "Ada", role: "admin" } })
  async findOne(@Param("id") id: string) {
    return this.users.find(id);   // must resolve to z.input<typeof User>
  }

  @Get()
  @Returns(z.array(User))
  list() {
    return this.users.all();
  }

  @Post()
  @Returns(User, { status: 201, description: "Created" })
  create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
    return this.users.create(body);
  }
}
```

### What happens at runtime

The value the handler returns (or resolves to) goes through `schema.safeParseAsync` before it is serialized:

- **Unknown keys are stripped.** A `z.object` drops properties it does not declare, so a database row with a `passwordHash` column cannot leak into the response by accident.
- **Defaults and transforms are applied.** In the example, a user returned without `role` is sent with `role: "user"`.
- **An invalid value is a `500`,** never a `400`: the server produced it, so the client is not to blame. The client receives the usual `{ "statusCode": 500, "message": "Internal Server Error" }`, and the failure is logged as a `ResponseValidationError` (`BNS-HTTP-003`) whose `cause` holds the Zod issues.
- **`status` is applied** to the response as well as the document, so `{ status: 201 }` both documents and responds with `201`. A status the handler sets itself (`ctx.statusCode`) takes precedence.
- **A `Response`, `ReadableStream` or `Blob` passes through unparsed.** Returning one means the handler has taken over the body.

Parsing costs one schema validation per request. On a hot route, or when the value is already known to be correct, turn it off with `parse: false`: the schema then only types and documents the route.

```ts
@Get("feed")
@Returns(Feed, { parse: false })
feed() { ... }
```

### Typing

With parsing on (the default), the handler returns the schema's **input** type (`z.input<typeof User>`): fields with a `.default()` may be left out, because parsing fills them in. With `parse: false`, nothing fills them in, so the handler must return the **output** type (`z.output<typeof User>`). Either way, the document describes the output, because that is what the client receives.

`example` and `examples` are type-checked against the output type, so an example cannot drift from the schema without a compile error.

The check is performed by TypeScript on the decorator, so an error reads *"Unable to resolve signature of method decorator"*, followed by the property that does not match. Two TypeScript limits to know about:

- **Literal types are widened** in a method without a return annotation: `return { role: "admin" }` is inferred as `role: string` and rejected by a `z.enum`. Write `"admin" as const`, or annotate the method, as in `findOne(): z.input<typeof User>`.
- **Extra properties are allowed** by TypeScript, since the return value is not an object literal checked in place. That is what runtime parsing is for. With `parse: false` those properties are sent to the client.

### Options

```ts
interface ReturnsOptions<T> {
  status?: number;                  // default 200; also applied to the response
  description?: string;             // default "Successful response"
  example?: T;                      // checked against the schema's output
  examples?: Record<string, { summary?: string; description?: string; value: T }>;
  contentType?: string;             // default "application/json"
  parse?: boolean;                  // default true
}
```

`@Returns` registers an ordinary `@ApiResponse`, so it can be combined with others that document the error cases:

```ts
@Get(":id")
@Returns(User)
@ApiResponse({ status: 404, description: "No user with that id", example: { message: "User not found" } })
findOne(@Param("id") id: string) { ... }
```

Use `@ApiResponse({ schema })` instead when you only want to document a body, without typing the handler or parsing its result.

## Response payloads

By default `@ApiResponse` documents only a status and a description. To show what the response **body** looks like, pass a `schema`, an `example`, or both. Swagger UI then renders the model under the status code and shows the example (or, without one, an example it generates from the schema).

```ts
import { z } from "zod";
import { ApiResponse, Controller, Get, NotFoundException, Param } from "@grupodiariodaregiao/bunstone";

const User = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["admin", "user"]).default("user"),
});

@Controller("users")
export class UsersController {
  @Get(":id")
  @ApiResponse({
    status: 200,
    description: "The user",
    schema: User,
    example: { id: "1", name: "Ada", role: "admin" },
  })
  @ApiResponse({
    status: 404,
    description: "No user with that id",
    schema: { type: "object", properties: { message: { type: "string" } } },
    example: { message: "User not found" },
  })
  findOne(@Param("id") id: string): z.infer<typeof User> {
    if (id !== "1") throw new NotFoundException("User not found");
    return { id, name: "Ada", role: "admin" };
  }

  @Get()
  @ApiResponse({ status: 200, description: "Every user", schema: z.array(User) })
  list() {
    return [];
  }
}
```

The options:

- `schema` — a Zod schema or a plain JSON Schema object. A Zod schema is converted with `z.toJSONSchema` from its **output** side, because the handler produces the value: a field with `.default()` is documented as always present. A plain object is copied into the document as written.
- `example` — one example payload, emitted as the media type's `example`.
- `examples` — several named examples, `{ [name]: { summary?, description?, value } }`. Swagger UI shows them in a dropdown.
- `contentType` — the media type of the body. Default `application/json`.

`example` and `examples` can be used with or without a `schema`. A response that passes none of them is documented without a `content` entry, the right way to describe a `204` or an error whose body you do not want to document.

Several examples for the same status:

```ts
@ApiResponse({
  status: 422,
  description: "Validation failed",
  examples: {
    missingName: {
      summary: "Name is missing",
      value: { statusCode: 422, errors: [{ field: "name", message: "Required" }] },
    },
    shortName: {
      summary: "Name is too short",
      value: { statusCode: 422, errors: [{ field: "name", message: "Too small" }] },
    },
  },
})
```

A body that is not JSON:

```ts
@Get("export")
@SetHeader("content-type", "text/csv")
@ApiResponse({
  status: 200,
  contentType: "text/csv",
  schema: { type: "string" },
  example: "id,name\n1,Ada",
})
exportCsv() {
  return "id,name\n1,Ada";
}
```

The `@ApiResponse` above generates:

```json
"responses": {
  "200": {
    "description": "The user",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "role": { "type": "string", "enum": ["admin", "user"], "default": "user" }
          },
          "required": ["id", "name", "role"],
          "additionalProperties": false
        },
        "example": { "id": "1", "name": "Ada", "role": "admin" }
      }
    }
  },
  "404": {
    "description": "No user with that id",
    "content": {
      "application/json": {
        "schema": { "type": "object", "properties": { "message": { "type": "string" } } },
        "example": { "message": "User not found" }
      }
    }
  }
}
```

The same rules apply as for request bodies: a Zod type with no JSON Schema equivalent is documented as a permissive schema instead of failing the boot, and a self-referencing schema is moved into `components.schemas` (named `<Controller><Handler>Response<status>`) and referenced from there.

The schema is documentation only. Bunstone does **not** validate what the handler returns against it, and the example is not checked against the schema either.

## File uploads (multipart/form-data)

A route that reads its body with [`@FormData()`](./uploads-and-static.md#uploads) is documented with a `multipart/form-data` request body instead of `application/json`. With no options you get a generic object:

```json
"requestBody": {
  "required": true,
  "content": { "multipart/form-data": { "schema": { "type": "object" } } }
}
```

To have Swagger UI render the actual form, with a text input per field and a **file picker** per file, describe it in the decorator:

```ts
import { z } from "zod";
import { Controller, FormData, Post } from "@grupodiariodaregiao/bunstone";
import type { InferFormData } from "@grupodiariodaregiao/bunstone";

const Profile = z.object({
  name: z.string().min(2),
  age: z.coerce.number().int().optional(),
});

@Controller("profiles")
export class ProfilesController {
  @Post()
  create(
    @FormData({
      fields: Profile,
      files: {
        avatar: {
          required: true,
          description: "Profile picture",
          accept: ["image/png", "image/jpeg"],
        },
        attachments: { multiple: true, accept: "application/pdf" },
      },
    })
    form: InferFormData<typeof Profile>,
  ) {
    const [avatar] = form.filesByField.avatar;
    return { name: form.fields.name, avatar: avatar.name };
  }
}
```

- `fields`: a Zod object schema. Its properties and `required` list go into the document, and at runtime it validates the text fields.
- `files`: the file fields, keyed by form field name. Each one becomes a `{ type: "string", format: "binary" }` property, or an array of them when `multiple: true`.
  - `required`: listed in the schema's `required` and enforced at runtime (a missing file gets `400`).
  - `multiple`: the field accepts several files.
  - `description`: shown next to the field.
  - `accept`: one or more media types, emitted as the part's `encoding.contentType`. This value is **documentation only**: the file's type is not checked (see [Uploads](./uploads-and-static.md#uploads) for enforcing it).

The route above produces:

```json
"requestBody": {
  "required": true,
  "content": {
    "multipart/form-data": {
      "schema": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "minLength": 2 },
          "age": { "type": "integer" },
          "avatar": { "type": "string", "format": "binary", "description": "Profile picture" },
          "attachments": { "type": "array", "items": { "type": "string", "format": "binary" } }
        },
        "required": ["name", "avatar"]
      },
      "encoding": {
        "avatar": { "contentType": "image/png, image/jpeg" },
        "attachments": { "contentType": "application/pdf" }
      }
    }
  }
}
```

In Swagger UI, **Try it out** then shows the form, and **Execute** sends a real multipart upload.

Multipart fields always arrive as text, so parse non-string fields from strings: `z.coerce.number()` for numbers and `z.stringbool()` for booleans. Avoid `z.coerce.boolean()`, which turns `"false"` into `true`. Both are still documented with their real type (`integer`, `boolean`).
