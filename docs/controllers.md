# Controllers

Controllers map incoming HTTP requests to methods. A controller is a class decorated with `@Controller`; its methods are decorated with an HTTP-method decorator.

## @Controller()

The argument is an optional base path that is prepended to every route in the class.

```ts
import { Controller, Get } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get()
  list() {
    return { list: ["ada", "linus"] };
  }
}
```

Register the controller in a module's `controllers` array to activate it. Controllers participate in DI, so they can receive providers through their constructor.

## HTTP methods

Each decorator takes an optional sub-path (default `/`):

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Patch(path?)`
- `@Delete(path?)`
- `@Head(path?)`
- `@Options(path?)`

```ts
@Controller("posts")
export class PostsController {
  @Get(":id")
  findOne() {}

  @Post()
  create() {}

  @Delete(":id")
  remove() {}
}
```

## Parameters

Parameter decorators pull data out of the request into method arguments:

- `@Param(name?)` — a path parameter, or the full params object when called without a name.
- `@Query(name?)` — a query-string value, or the full query object when called without a name.
- `@Body(schema?)` — the parsed request body.
- `@Header(name)` — a single request header.
- `@Req()` — the raw Bun `Request` (with `params` attached).
- `@Ctx()` — the full `RequestContext` (`req`, `url`, `params`, `query`, `headers`, `state`, `responseHeaders`, and more).

```ts
import { Controller, Get, Header, Param, Query } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get(":id")
  findOne(@Param("id") id: string, @Header("x-trace") trace?: string) {
    return { id, trace };
  }

  @Get()
  search(@Query("q") q?: string) {
    return { q };
  }
}
```

## Validation with Zod

Pass a Zod schema to `@Body`, `@Query`, or `@Param`. The incoming value is parsed and validated; the argument is the typed, validated result. Invalid input is rejected with `400` and a list of field errors.

```ts
import { Body, Controller, Post } from "@grupodiariodaregiao/bunstone";
import { z } from "zod";

const CreateUser = z.object({
  name: z.string().min(2),
  age: z.number(),
});

@Controller("users")
export class UsersController {
  @Post()
  create(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
    return { created: body };
  }
}
```

A failed validation responds with a body shaped like:

```json
{ "statusCode": 400, "errors": [{ "field": "age", "message": "..." }] }
```

## Response headers

Add a static response header to a route with `@SetHeader(name, value)`.

```ts
import { Controller, Get, SetHeader } from "@grupodiariodaregiao/bunstone";

@Controller("feed")
export class FeedController {
  @Get("raw")
  @SetHeader("content-type", "application/xml")
  xml() {
    return "<ok/>";
  }
}
```

## Return values

The value a handler returns is serialized automatically:

- **object** → JSON response (`200`).
- **string** → `text/plain` response (`200`).
- **`null` / `undefined`** → empty `204 No Content`.
- **`Response`** → returned as-is (passthrough), with any `@SetHeader` values applied.
- **`ReadableStream` / `Blob`** → streamed as the response body.

```ts
@Get("download")
download() {
  return new Response("file contents", {
    headers: { "content-disposition": "attachment" },
  });
}
```

## Exceptions

Throw an `HttpException` (or one of its subclasses) to produce an error response with the matching status code. The message or object you pass becomes the response body.

```ts
import { Controller, Get, NotFoundException, Param } from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UsersController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    if (id !== "1") {
      throw new NotFoundException("User not found");
    }
    return { id };
  }
}
```

Built-in exceptions:

- `HttpException(response, status)` — the base class for a custom status.
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `ConflictException` (409)
- `UnprocessableEntityException` (422)
- `TooManyRequestsException` (429)
- `InternalServerErrorException` (500)

A string argument produces `{ "message": "..." }`; an object argument is used as the body verbatim.
