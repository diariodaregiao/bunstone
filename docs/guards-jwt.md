# Guards & JWT

Guards decide whether a request is allowed to reach a handler. Bunstone ships a general guard mechanism plus a ready-made JWT integration built on top of it.

## Guards

A guard is a provider that implements `GuardContract`. Its `canActivate` method receives the `RequestContext` and returns `true` to allow the request or `false` (or throws) to reject it. Because guards are providers, they can inject other services through their constructor.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";
import type { GuardContract, RequestContext } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ApiKeyGuard implements GuardContract {
  canActivate(ctx: RequestContext): boolean {
    return ctx.headers.get("x-api-key") === "secret";
  }
}
```

Attach it with `@UseGuards`, on a single route or on the whole controller. Remember to register the guard in the module's `providers` so it can be resolved.

```ts
import { Controller, Get, UseGuards } from "@grupodiariodaregiao/bunstone";

@Controller("admin")
export class AdminController {
  @Get("secret")
  @UseGuards(ApiKeyGuard)
  secret() {
    return { secret: 42 };
  }
}

@Module({
  controllers: [AdminController],
  providers: [ApiKeyGuard],
})
export class AdminModule {}
```

When a guard returns `false`, the request is rejected with `403 Forbidden`. A guard may also throw an `HttpException` to control the exact status and body.

The `RequestContext` passed to `canActivate` exposes `headers`, `params`, `query`, `url`, `req`, and a mutable `state` object that guards can use to pass data to the handler.

## JWT

### Setup

`JwtModule.register(...)` returns a global dynamic module, so `JwtService` and the JWT guard are available application-wide once it is imported into the root module.

```ts
import { JwtModule, Module } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    JwtModule.register({
      secret: "your-secret-key",
      expiresIn: "1h",
      issuer: "my-app",
      audience: "my-clients",
    }),
  ],
})
export class AppModule {}
```

Only `secret` is required. `expiresIn`, `issuer`, and `audience` are optional and, when set, are applied to signing and enforced during verification.

### JwtService

Inject `JwtService` to sign, verify, and decode tokens.

```ts
import { Injectable, JwtService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(userId: string) {
    return this.jwt.sign({ sub: userId, role: "admin" });
  }

  async check(token: string) {
    const payload = await this.jwt.verify<{ sub: string }>(token);
    return payload?.sub ?? null;
  }
}
```

- `sign(payload, overrides?)` — returns a signed token. `overrides` can replace `expiresIn`, `issuer`, or `audience` for a single call.
- `verify<T>(token)` — returns the decoded payload, or `null` if the token is invalid, tampered with, or expired.
- `decode<T>(token)` — decodes the payload **without** verifying the signature.

### Protecting routes

`@Jwt()` is a built-in guard. It reads the `Authorization: Bearer <token>` header, verifies it with `JwtService`, and stores the payload on `ctx.state.jwt`. A missing or invalid token results in `401 Unauthorized`.

`@JwtPayload()` is a parameter decorator that reads that stored payload into a handler argument.

```ts
import { Controller, Get, Jwt, JwtPayload } from "@grupodiariodaregiao/bunstone";

@Controller("me")
export class MeController {
  @Get()
  @Jwt()
  profile(@JwtPayload() payload: { sub: string }) {
    return { sub: payload.sub };
  }
}
```

`@Jwt()` composes cleanly with other guards — stack it alongside `@UseGuards(RoleGuard)` to require both a valid token and a custom check.
