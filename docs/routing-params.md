# Routing & Parameters

Bunstone uses decorators to define routes and extract parameters from requests.

## @Controller()

Defines a class as a controller with an optional base path.

```typescript
@Controller("users")
export class UserController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id };
  }
}
```

## HTTP Methods

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`

## Parameter Decorators

Extract data directly into your method arguments:

- `@Param(name?)`: Path parameters.
- `@Query(name?)`: Query string parameters.
- `@Body(schema?)`: Request body (supports Zod validation).
- `@Header(name)`: Request headers.
- `@Request()`: The full Elysia request object.

## Response Customization

### @SetResponseHeader(name, value)

Sets a custom header for the response.

```typescript
@Get("xml")
@SetResponseHeader("Content-Type", "text/xml")
getXml() {
  return "<xml><message>Hello</message></xml>";
}
```

### Zod Validation

You can pass a Zod schema to `@Body`, `@Query`, or `@Param` for automatic validation.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  age: z.number()
});

@Post()
create(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
  return data; // data is already validated and typed
}
```

## Practical Example

See more examples of routing, parameters, and validation:

<<< @/../examples/02-routing-params/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/02-routing-params/index.ts)
