# Rate Limiting

Proteja seus endpoints contra abuso com rate limiting configurável. O Bunstone oferece suporte a limitação de requisições em múltiplos níveis, com storage em memória ou Redis.

## Visão Geral

O sistema de rate limiting do Bunstone oferece:

- **Múltiplos níveis de configuração**: Global, Controller ou Endpoint
- **Storage flexível**: Memória (padrão) ou Redis (produção)
- **Identificação inteligente**: IP + Método + Endpoint
- **Headers automáticos**: Informações de limites em todas as respostas
- **Mensagens customizáveis**: Personalize a mensagem de erro 429

## Uso Básico

### Por Endpoint com @RateLimit()

Use o decorator `@RateLimit()` para aplicar limites específicos a endpoints individuais:

```typescript
import { Controller, Get, Post, RateLimit } from "@grupodiariodaregiao/bunstone";

@Controller("api")
export class ApiController {
  @Get("public")
  @RateLimit({ max: 100, windowMs: 60000 }) // 100 requisições/minuto
  getPublic() {
    return { data: [] };
  }

  @Post("sensitive")
  @RateLimit({ max: 5, windowMs: 60000 }) // 5 requisições/minuto (mais restritivo)
  createSensitive() {
    return { success: true };
  }
}
```

### Configuração Global

Aplique rate limiting em toda a aplicação via `AppStartup.create()`:

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000, // 1000 requisições/minuto para todos os endpoints
  },
});
```

## Opções de Configuração

### @RateLimit() Decorator

```typescript
@RateLimit({
  max: 100,              // Máximo de requisições na janela
  windowMs: 60000,       // Janela de tempo em milissegundos (1 minuto)
  message?: string,      // Mensagem personalizada quando exceder (opcional)
  storage?: Storage,     // Storage customizado (opcional)
  keyGenerator?: fn,     // Função para gerar chave de identificação (opcional)
  skipHeader?: string,   // Header que permite bypass (opcional)
  skip?: fn              // Função para pular rate limit (opcional)
})
```

### Configuração Global

```typescript
{
  rateLimit: {
    enabled?: boolean,     // Habilita/desabilita rate limiting global
    max?: number,          // Máximo de requisições (padrão: 100)
    windowMs?: number,     // Janela em ms (padrão: 60000)
    storage?: Storage,     // Storage customizado
    keyGenerator?: fn,     // Gerador de chave customizado
    skipHeader?: string,   // Header de bypass
    skip?: fn,             // Função de bypass
    message?: string       // Mensagem de erro
  }
}
```

## Storage

### MemoryStorage (Padrão)

Ideal para desenvolvimento e aplicações single-instance:

```typescript
// Não requer configuração - é o padrão
@RateLimit({ max: 100, windowMs: 60000 })
```

### RedisStorage

Para aplicações em produção com múltiplas instâncias:

```typescript
import { RedisStorage } from "@grupodiariodaregiao/bunstone";
import Redis from "ioredis"; // ou "redis"

const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000,
    storage: new RedisStorage(redisClient, "ratelimit:"), // prefix opcional
  },
});
```

## Headers de Resposta

Todas as respostas incluem headers informativos:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706640000
```

Quando o limite é excedido (HTTP 429):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706640000
Retry-After: 45

{ "status": 429, "message": "Too many requests, please try again later." }
```

## Casos de Uso Avançados

### Chave de Identificação Customizada

Por padrão, a chave é `IP:Método:Path`. Você pode customizar:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  keyGenerator: (req) => {
    // Rate limit por usuário autenticado em vez de IP
    return req.headers["x-user-id"] || req.ip;
  },
})
```

### Bypass via Header

Permitir bypass em ambientes internos:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skipHeader: "x-internal-request", // Requisições com este header ignoram o limit
})
```

### Bypass Condicional

Lógica customizada para pular rate limiting:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skip: (req) => {
    // Pular para IPs internos
    return req.ip?.startsWith("10.0.0.");
  },
})
```

### Mensagens Customizadas

```typescript
@RateLimit({
  max: 5,
  windowMs: 60000,
  message: "Você atingiu o limite de tentativas. Aguarde 1 minuto.",
})
```

## Hierarquia de Configuração

As configurações são aplicadas na seguinte ordem de precedência:

1. **Decorator `@RateLimit()`** (maior precedência)
2. **Configuração do Controller** (se implementado)
3. **Configuração Global** em `AppStartup.create()`
4. **Sem rate limit** (padrão se nenhuma configuração)

Exemplo de mesclagem:

```typescript
// Configuração global: 1000 req/min
const app = await AppStartup.create(AppModule, {
  rateLimit: { enabled: true, max: 1000, windowMs: 60000 },
});

@Controller("api")
class ApiController {
  @Get("strict")
  @RateLimit({ max: 10 }) // Usa 10 req/min (sobrescreve global)
  strictEndpoint() {}

  @Get("default")
  defaultEndpoint() {} // Usa 1000 req/min (herda global)
}
```

## Exemplo Completo

<<< @/../examples/08-ratelimit/index.ts

## Dicas de Produção

1. **Use RedisStorage** para aplicações multi-instância
2. **Configure skipHeader** para health checks e monitoramento interno
3. **Ajuste windowMs** conforme o padrão de uso (APIs REST geralmente usam 1 minuto)
4. **Monitore os headers** para entender o padrão de uso
5. **Mensagens informativas** ajudam usuários a entenderem os limites

## API Reference

### Classes

- `RateLimitService` - Serviço principal de rate limiting
- `MemoryStorage` - Implementação em memória
- `RedisStorage` - Implementação Redis

### Interfaces

- `RateLimitStorage` - Interface para implementações customizadas
- `RateLimitConfig` - Configuração de rate limit
- `RateLimitInfo` - Informações de consumo
- `RateLimitHeaders` - Headers de resposta

### Decorators

- `@RateLimit(options)` - Aplica rate limit a um endpoint

### Exceptions

- `RateLimitExceededException` - Lançada quando limite é excedido

[Ver exemplo completo no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-ratelimit/index.ts)
