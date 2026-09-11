# Bearer Auth no Swagger UI

## Resumo

Adiciona suporte a autenticação Bearer no documento OpenAPI gerado pelo Bunstone, habilitando o botão **Authorize** do Swagger UI. Com isso, é possível informar o token **uma única vez** e testar todas as rotas protegidas diretamente pela documentação, sem precisar colar `Authorization` manualmente em cada requisição.

## Motivação

APIs protegidas por Bearer token (guards customizados, `@Jwt()`, etc.) exigiam testes manuais via curl ou ferramentas externas. O Swagger UI já suporta isso nativamente, mas só quando o `openapi.json` declara `components.securitySchemes` e `security` — o Bunstone não emitia essas seções.

Isso dificultava o fluxo de desenvolvimento: abrir `/docs`, tentar **Try it out** e receber `401` sem uma forma clara de autenticar.

## O que mudou

### Nova opção `openapi.bearer`

```ts
const app = await Application.create(AppModule, {
  openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
    bearer: true,
  },
});
```

- Emite `components.securitySchemes.bearerAuth` (`type: http`, `scheme: bearer`)
- Adiciona `security` global no documento — todas as rotas documentadas herdam o Bearer
- Independente de `openapi.auth` (Basic Auth que protege `/docs` e `/openapi.json`)

Configuração opcional:

```ts
bearer: {
  description: "Cole seu token de API",
  bearerFormat: "token",
}
```

### Decorator `@ApiBearerAuth()`

Para APIs mistas (rotas públicas + protegidas), sem bearer global:

```ts
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {}
```

Apenas controllers/handlers anotados aparecem como protegidos no spec.

### Swagger UI

- `persistAuthorization: true` — o token persiste após refresh da página
- O usuário digita o token **sem** o prefixo `Bearer `; o Swagger UI envia `Authorization: Bearer <token>` automaticamente

### Exports públicos

- `ApiBearerAuth`
- `OpenApiBearerAuth`
- `BuildOpenApiOptions`

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/openapi/builder.ts` | `securitySchemes`, `security` global e por operação |
| `src/openapi/decorators.ts` | `@ApiBearerAuth()` e helpers de metadata |
| `src/openapi/ui.ts` | `persistAuthorization: true` |
| `src/openapi/index.ts` | re-exports |
| `src/http/server.ts` | `openapi.bearer` em `OpenApiServeOptions` |
| `index.ts` | exports públicos |
| `tests/openapi/openapi.test.ts` | testes de bearer global e `@ApiBearerAuth()` |
| `docs/openapi.md` | documentação |
| `AGENTS.md`, `llms.txt` | regenerados |

## Como testar

1. Habilitar OpenAPI com bearer:

```ts
openapi: {
  info: { title: "API", version: "1.0.0" },
  ui: true,
  bearer: true,
}
```

2. Subir o app e abrir `/docs`
3. Clicar em **Authorize**, informar o token (ex.: `teste`)
4. Usar **Try it out** em qualquer rota protegida — a requisição deve incluir `Authorization: Bearer teste`

### Testes automatizados

```bash
bun test tests/openapi/openapi.test.ts
```

Cobertura:

- Spec com `securitySchemes.bearerAuth` e `security` global
- HTML do Swagger UI com `persistAuthorization`
- `@ApiBearerAuth()` aplicando security só em rotas anotadas

## Breaking changes

Nenhum. A opção `bearer` é opt-in; apps existentes sem ela continuam iguais.

## Checklist

- [x] Opção `openapi.bearer` documentada
- [x] Decorator `@ApiBearerAuth()` para rotas seletivas
- [x] Swagger UI persiste token entre refreshes
- [x] Testes passando
- [x] Docs atualizadas
