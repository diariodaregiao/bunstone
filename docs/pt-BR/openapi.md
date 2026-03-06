# OpenAPI (Swagger)

O Bunstone fornece suporte nativo à documentação OpenAPI (Swagger) usando decorators, de forma semelhante ao NestJS.

## Instalação

O suporte a OpenAPI já vem embutido, mas você precisa habilitá-lo no seu `AppStartup`.

## Configuração

Habilite o Swagger nas opções de `AppStartup.create`:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs", // o padrão é /swagger
    documentation: {
      info: {
        title: "Minha API",
        version: "1.0.0",
        description: "Documentação da API",
      },
    },
  },
}).listen(3000);
```

## Proteção com Basic Auth

Opcionalmente, você pode proteger a página de documentação do Swagger com autenticação HTTP Basic fornecendo credenciais em `auth`:

```typescript
await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    auth: {
      username: "admin",
      password: "secret",
    },
    documentation: {
      info: {
        title: "Minha API",
        version: "1.0.0",
      },
    },
  },
}).listen(3000);
```

Quando `auth` está definido, qualquer requisição para o caminho da documentação (e seus subcaminhos, como `/docs/json`) exigirá um header válido `Authorization: Basic <base64(username:password)>`. Requisições não autenticadas recebem uma resposta `401 Unauthorized` com um desafio `WWW-Authenticate`, o que faz os navegadores exibirem uma caixa de login nativa. Por segurança, você só deve expor esse endpoint via HTTPS (ou atrás de um proxy reverso que finalize o HTTPS), já que as credenciais de Basic Auth, caso contrário, são enviadas em texto claro e podem ser interceptadas.

## Decorators

### @ApiTags()

Adiciona tags a um controller ou a um método específico.

```typescript
@ApiTags("Usuários")
@Controller("users")
export class UserController {
  @ApiTags("Perfil")
  @Get("profile")
  getProfile() {}
}
```

### @ApiOperation()

Define o resumo e a descrição de um endpoint.

```typescript
@ApiOperation({ summary: 'Criar um usuário', description: 'Este endpoint cria um novo usuário no banco de dados' })
@Post()
create() {}
```

### @ApiResponse()

Define as possíveis respostas para um endpoint.

```typescript
@ApiResponse({ status: 200, description: 'Usuário encontrado' })
@ApiResponse({ status: 404, description: 'Usuário não encontrado' })
@Get(':id')
findOne() {}
```

### @ApiHeader() / @ApiHeaders()

Define headers personalizados para um endpoint ou controller.

```typescript
@ApiHeader({ name: "X-Custom-Header", description: "Um header personalizado" })
@Controller("users")
export class UserController {
  @ApiHeaders([
    { name: "X-Token", description: "Token de autenticação", required: true },
    { name: "X-Version", description: "Versão da API" },
  ])
  @Get()
  findAll() {}
}
```

## DTOs e Schemas

O Bunstone usa **Zod** para validação. Quando você usa `@Body(Schema)`, `@Query(Schema)` ou `@Param(Schema)`, o schema é automaticamente registrado na documentação OpenAPI.

```typescript
const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

@Post()
@ApiOperation({ summary: 'Criar usuário' })
create(@Body(CreateUserSchema) body: any) {
  return body;
}
```

## Exemplo prático

Explore uma configuração completa de OpenAPI e seu uso:

<<< @/../examples/08-openapi/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-openapi/index.ts)
