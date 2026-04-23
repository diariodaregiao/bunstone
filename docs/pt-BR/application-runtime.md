# Runtime da Aplicação

Esta página cobre a API de runtime que inicializa uma aplicação Bunstone e as opções que afetam o comportamento da app.

## `AppStartup.create()`

`AppStartup.create(RootModule, options?)` inicializa o grafo de dependências, registra controllers, middleware, schedulers, filas e retorna uma referência da aplicação.

```typescript
import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

const app = await AppStartup.create(AppModule, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  viewsDir: "src/views",
  swagger: {
    path: "/docs",
    documentation: {
      info: {
        title: "Bunstone API",
        version: "1.0.0",
      },
    },
  },
  rateLimit: {
    enabled: true,
    max: 100,
    windowMs: 60_000,
  },
});

app.listen(3000);
```

### Valor de retorno

`AppStartup.create()` resolve para um objeto com:

- `listen(port)` para iniciar o servidor HTTP
- `getElysia()` para acessar a instância interna do Elysia

## Opções de Runtime

### `cors`

Encaminha as opções diretamente para `@elysiajs/cors`.

```typescript
const app = await AppStartup.create(AppModule, {
  cors: {
    origin: ["https://example.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

### `viewsDir`

Quando definido, o Bunstone percorre o diretório e gera bundles das views React usadas por `@Render()` para hidratação SSR.

```typescript
const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views",
});
```

### `swagger`

Habilita a Swagger UI embutida e o endpoint JSON da spec.

```typescript
const app = await AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    documentation: {
      info: {
        title: "Minha API",
        version: "1.0.0",
      },
    },
    auth: {
      username: "admin",
      password: "secret",
    },
  },
});
```

### `rateLimit`

Aplica um rate limit global que pode ser sobrescrito por `@RateLimit()`.

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60_000,
  },
});
```

## Arquivos Estáticos

O Bunstone serve automaticamente o diretório `public/` sob `/public`.

- Arquivo local: `public/logo.png`
- URL pública: `/public/logo.png`

Se `public/` ainda não existir, o Bunstone cria a pasta durante a inicialização.

## Tratamento de Erros

Comportamento embutido durante startup/runtime:

- Instâncias de `HttpException` retornam o status code e body configurados.
- Erros de validação do Zod são normalizados para status `400` com `field` e `message`.
- Erros desconhecidos retornam status `500`.

## Guias Relacionados

- [Primeiros Passos](./getting-started.md)
- [Roteamento & Parâmetros](./routing-params.md)
- [OpenAPI (Swagger)](./openapi.md)
- [Rate Limiting](./rate-limiting.md)
- [MVC & SSR](./mvc-ssr.md)
