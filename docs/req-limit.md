# Rate Limiting (ReqLimit)

O decorator `@ReqLimit` permite aplicar limitação de taxa (rate limiting) em endpoints da sua aplicação, protegendo-os contra abuso e ataques DDoS.

## Conceitos

- **TTL (Time To Live)**: Janela de tempo em milissegundos para contagem de requisições
- **Limit**: Número máximo de requisições permitidas dentro da janela TTL
- **Identificador**: Por padrão, o IP do cliente é usado para rastrear requisições

## Uso Básico

```typescript
import { Controller, Post, ReqLimit } from "bunstone";

@Controller("api")
class ApiController {
  @ReqLimit({ ttl: 60000, limit: 10 })
  @Post("endpoint")
  async handle() {
    return { message: "Success" };
  }
}
```

No exemplo acima:
- `ttl: 60000` = 60 segundos (1 minuto)
- `limit: 10` = Máximo de 10 requisições por minuto

## Exemplos

### Proteção de Login

```typescript
@Controller("auth")
class AuthController {
  // Limita tentativas de login: 5 por minuto
  @ReqLimit({ ttl: 60000, limit: 5 })
  @Post("login")
  async login(@Body() credentials: LoginDto) {
    // Lógica de autenticação
  }
}
```

### API Pública com Rate Limit

```typescript
@Controller("public")
class PublicController {
  // 100 requisições por minuto
  @ReqLimit({ ttl: 60000, limit: 100 })
  @Get("data")
  async getData() {
    return { data: [...] };
  }
}
```

### Operações Sensíveis

```typescript
@Controller("user")
class UserController {
  // Apenas 3 tentativas a cada 10 segundos
  @ReqLimit({ ttl: 10000, limit: 3 })
  @Post("password-reset")
  async resetPassword(@Body() body: ResetDto) {
    // Lógica de reset de senha
  }
}
```

## Configuração

### Parâmetros do Decorator

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `ttl` | number | Tempo em milissegundos da janela de contagem |
| `limit` | number | Número máximo de requisições permitidas |

### Valores Comuns de TTL

```typescript
// 10 segundos
@ReqLimit({ ttl: 10000, limit: 5 })

// 1 minuto
@ReqLimit({ ttl: 60000, limit: 10 })

// 5 minutos
@ReqLimit({ ttl: 300000, limit: 50 })

// 1 hora
@ReqLimit({ ttl: 3600000, limit: 1000 })
```

## Identificação de Clientes

O rate limiter identifica clientes pelo IP usando a seguinte ordem de prioridade:

1. Header `x-forwarded-for` (para proxies/load balancers)
2. Header `x-real-ip`
3. IP direto da conexão
4. "unknown" como fallback

## Respostas HTTP

### Requisição Permitida
```
Status: 200 OK
```

### Limite Excedido
```
Status: 429 Too Many Requests
```

## Combinação com Guards

O `@ReqLimit` pode ser combinado com guards para segurança adicional:

```typescript
@Controller("admin")
class AdminController {
  @ReqLimit({ ttl: 60000, limit: 20 })
  @Guard(AdminGuard)
  @Post("action")
  async adminAction() {
    // Protegido por rate limit E guard
  }
}
```

A ordem de execução é:
1. **ReqLimit** verifica o limite de taxa primeiro
2. **Guard** valida permissões depois

## Estratégias de Rate Limiting

### Proteção Agressiva
```typescript
// Para endpoints muito sensíveis
@ReqLimit({ ttl: 5000, limit: 1 })
@Post("critical-operation")
```

### Proteção Moderada
```typescript
// Para endpoints normais de API
@ReqLimit({ ttl: 60000, limit: 100 })
@Get("api/resource")
```

### Proteção Leve
```typescript
// Para endpoints públicos
@ReqLimit({ ttl: 60000, limit: 1000 })
@Get("public/content")
```

## Limitações e Considerações

### Armazenamento em Memória
- O rate limiter usa armazenamento em memória (in-memory)
- Dados são perdidos ao reiniciar a aplicação
- Para ambientes distribuídos, considere usar Redis ou similar

### Limpeza Automática
- O sistema limpa automaticamente entradas antigas a cada 60 segundos
- Isso evita vazamento de memória com muitos IPs diferentes

### Múltiplas Instâncias
- Em ambientes com múltiplas instâncias da aplicação:
  - Cada instância mantém seu próprio contador
  - O limite efetivo é multiplicado pelo número de instâncias
  - Para controle preciso, implemente storage compartilhado

## Exemplo Completo

```typescript
import {
  Module,
  Controller,
  Post,
  Get,
  AppStartup,
  ReqLimit,
  Guard,
  Body,
} from "bunstone";

@Controller("api")
class ApiController {
  @ReqLimit({ ttl: 60000, limit: 5 })
  @Post("login")
  async login(@Body() credentials: any) {
    return { token: "..." };
  }

  @ReqLimit({ ttl: 60000, limit: 100 })
  @Get("products")
  async getProducts() {
    return { products: [...] };
  }

  @ReqLimit({ ttl: 10000, limit: 3 })
  @Guard(AdminGuard)
  @Post("admin/clear-cache")
  async clearCache() {
    return { success: true };
  }

  // Sem rate limit
  @Get("public/info")
  async getInfo() {
    return { info: "..." };
  }
}

@Module({
  controllers: [ApiController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000);
```

## Testando Rate Limiting

```bash
# Fazer múltiplas requisições rapidamente
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done
```

Após o limite, você verá:
```
Status: 429 Too Many Requests
Error: Too Many Requests
```

## Boas Práticas

1. **Seja Generoso**: Configure limites que não afetem usuários legítimos
2. **Proteja Endpoints Críticos**: Sempre aplique rate limiting em login, registro, e operações sensíveis
3. **Documente**: Informe aos usuários da API sobre os limites
4. **Monitore**: Acompanhe quantas requisições são bloqueadas
5. **Headers de Resposta**: Considere adicionar headers com informações de rate limit (implementação futura)

## Próximos Passos

- Implementar storage em Redis para ambientes distribuídos
- Adicionar headers de resposta com informações de rate limit
- Suporte a diferentes estratégias (sliding window, token bucket)
- Configuração global de rate limiting por módulo
