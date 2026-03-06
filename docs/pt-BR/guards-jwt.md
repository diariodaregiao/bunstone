# Guards & JWT

Proteja suas rotas usando Guards e suporte integrado a JWT.

## Guards

Guards implementam o `GuardContract` e retornam um booleano (ou uma Promise de um booleano).

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

## Integração com JWT

Bunstone fornece um `JwtModule` e um decorator `@Jwt()` para autenticação fácil.

### Configuração

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

### Uso

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

## Exemplo Prático

Confira um exemplo completo usando JWT e guards personalizados baseados em papéis:

<<< @/../examples/03-guards-auth/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/03-guards-auth/index.ts)
