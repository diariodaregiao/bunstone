# Roteamento & Parâmetros

Bunstone usa decorators para definir rotas e extrair parâmetros das requisições.

## @Controller()

Define uma classe como um controller com um caminho base opcional.

```typescript
@Controller("users")
export class UserController {
  @Get(":id")
  findOne(@Param("id") id: string) {
    return { id };
  }
}
```

## Métodos HTTP

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`
- `@Options(path?)`
- `@Head(path?)`

## Decorators de Parâmetros

Extraia dados diretamente para os argumentos do seu método:

- `@Param(name?)`: Parâmetros de rota.
- `@Query(name?)`: Parâmetros de query string.
- `@Body(schema?)`: Corpo da requisição (suporta validação com Zod).
- `@Header(name)`: Cabeçalhos da requisição.
- `@Request()`: O objeto completo de requisição do Elysia.

Você também pode passar schemas do Zod para `@Param()` e `@Query()` para parsing e validação automáticos.

## Personalização da Resposta

### @SetResponseHeader(name, value)

Define um cabeçalho personalizado para a resposta.

```typescript
@Get("xml")
@SetResponseHeader("Content-Type", "text/xml")
getXml() {
  return "<xml><message>Hello</message></xml>";
}
```

### Validação com Zod

Você pode passar um schema Zod para `@Body`, `@Query` ou `@Param` para validação automática.

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

## Exemplo Prático

Veja mais exemplos de roteamento, parâmetros e validação:

<<< @/../examples/02-routing-params/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/02-routing-params/index.ts)
