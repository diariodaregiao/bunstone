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

## Zod Integration

Bunstone automatically extracts Zod schemas from your decorators and includes them in the OpenAPI documentation.

### Request Body, Query, and Params

When you use a Zod schema in `@Body()`, `@Query()`, or `@Param()`, it is automatically registered as the schema for that part of the request.

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(3).describe('The name of the user'),
  email: z.string().email().describe('The email of the user')
});

@Post()
create(@Body(CreateUserSchema) body: any) {
  return body;
}
```

### Response Schemas

You can also document your response schemas using `@ApiResponse`. This is useful for documenting the structure of the data your API returns.

```typescript
const UserResponseSchema = z.object({
  id: z.string().uuid().describe('The unique identifier of the user'),
  name: z.string().describe('The full name of the user'),
  email: z.string().email().describe('The email address')
});

@Get(':id')
@ApiResponse({
  status: 200,
  description: 'User found',
  type: UserResponseSchema
})
findOne(@Param('id') id: string) {
  return { id, name: 'John Doe', email: 'john@example.com' };
}
```

### Schema Descriptions and Metadata

Zod provides a `.describe()` method that Bunstone uses to populate the `description` field in OpenAPI. You can also use other Zod features like `.optional()`, `.default()`, and validations (like `.email()`, `.min()`), which will be correctly reflected in the Swagger UI.

```typescript
const AdvancedSchema = z.object({
  username: z
    .string()
    .min(5)
    .max(20)
    .describe("The unique username for the account"),
  age: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("The age of the user (optional)"),
  role: z.enum(["admin", "user"]).default("user").describe("The user role"),
});
```

### Response Schemas

You can also document your response schemas using `@ApiResponse`.

```typescript
const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

@Get(':id')
@ApiResponse({
  status: 200,
  description: 'User found',
  type: UserResponseSchema
})
findOne(@Param('id') id: string) {
  return { id, name: 'John Doe', email: 'john@example.com' };
}
```

### Schema Descriptions

Use Zod's `.describe()` method to add descriptions to individual fields in your schemas. These will appear in the Swagger UI.

```typescript
const Schema = z.object({
  username: z.string().describe("Unique username for the account"),
});
```
