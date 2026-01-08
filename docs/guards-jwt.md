# Guards & JWT

Protect your routes using Guards and built-in JWT support.

## Guards

Guards implement the `GuardContract` and return a boolean (or a Promise of a boolean).

```typescript
export class AuthGuard implements GuardContract {
  validate(req: HttpRequest) {
    return req.headers["authorization"] === "secret-token";
  }
}

@Controller("admin")
export class AdminController {
  @Get("secret")
  @Guard(AuthGuard)
  getSecret() {
    return "Top Secret Data";
  }
}
```

## JWT Integration

Bunstone provides a `JwtModule` and a `@Jwt()` decorator for easy authentication.

### Setup

```typescript
@Module({
  imports: [
    JwtModule.register({
      name: "jwt",
      secret: "your-secret-key",
    }),
  ],
})
export class AppModule {}
```

### Usage

```typescript
@Controller("profile")
export class ProfileController {
  @Get()
  @Jwt() // Automatically uses the internal JwtGuard
  getProfile(@Request() req: any) {
    return req.jwt.user;
  }
}
```

## Practical Example

Check out a full example using both JWT and custom role-based guards:

<<< @/../examples/03-guards-auth/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/03-guards-auth/index.ts)
