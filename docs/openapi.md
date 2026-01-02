# OpenAPI (Swagger)

Bunstone provides built-in support for OpenAPI (Swagger) documentation using decorators, similar to NestJS.

## Installation

OpenAPI support is built-in, but you need to enable it in your `AppStartup`.

## Configuration

Enable Swagger in your `AppStartup.create` options:

```typescript
AppStartup.create(AppModule, {
  swagger: {
    path: "/docs", // default is /swagger
    documentation: {
      info: {
        title: "My API",
        version: "1.0.0",
        description: "API Documentation",
      },
    },
  },
}).listen(3000);
```

## Decorators

### @ApiTags()

Adds tags to a controller or a specific method.

```typescript
@ApiTags("Users")
@Controller("users")
export class UserController {
  @ApiTags("Profile")
  @Get("profile")
  getProfile() {}
}
```

### @ApiOperation()

Defines the summary and description for an endpoint.

```typescript
@ApiOperation({ summary: 'Create a user', description: 'This endpoint creates a new user in the database' })
@Post()
create() {}
```

### @ApiResponse()

Defines the possible responses for an endpoint.

```typescript
@ApiResponse({ status: 200, description: 'User found' })
@ApiResponse({ status: 404, description: 'User not found' })
@Get(':id')
findOne() {}
```

### @ApiHeader() / @ApiHeaders()

Defines custom headers for an endpoint or controller.

```typescript
@ApiHeader({ name: "X-Custom-Header", description: "A custom header" })
@Controller("users")
export class UserController {
  @ApiHeaders([
    { name: "X-Token", description: "Auth token", required: true },
    { name: "X-Version", description: "API Version" },
  ])
  @Get()
  findAll() {}
}
```

## DTOs and Schemas

Bunstone uses **Zod** for validation. When you use `@Body(Schema)`, `@Query(Schema)`, or `@Param(Schema)`, the schema is automatically registered in the OpenAPI documentation.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

@Post()
@ApiOperation({ summary: 'Create user' })
create(@Body(CreateUserSchema) body: any) {
  return body;
}
```
