# Testes

O Bunstone fornece um módulo de testes poderoso que facilita testes de integração e End-to-End (E2E). Ele permite compilar módulos com sobrescrita de providers (mocking) e interagir com sua aplicação sem vinculá-la a uma porta de rede real.

## Instalação

O módulo de testes está incluído no pacote principal:

```typescript
import { Test, TestingModule } from "@grupodiariodaregiao/bunstone";
```

## Conceitos básicos

Os testes no Bunstone giram em torno de três componentes principais:

1.  **`Test`**: Um utilitário estático para criar um `TestingModuleBuilder`.
2.  **`TestingModule`**: Um módulo compilado que dá acesso ao contêiner de Injeção de Dependência (DI).
3.  **`TestApp`**: Um wrapper em torno da sua aplicação que permite fazer requisições HTTP diretamente por meio de `app.handle()`.

---

## Testes de integração (sobrescrita de DI)

Você pode usar o módulo de testes para substituir serviços reais por mocks em testes de integração.

```typescript
import { describe, expect, it, mock } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";
import { UsersService } from "./users.service";

describe("Integração de usuários", () => {
  it("deve usar um serviço mockado", async () => {
    const mockUsersService = {
      findAll: () => [{ id: 1, name: "Test User" }],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .compile();

    const service = moduleRef.get(UsersService);
    expect(service.findAll()).toEqual([{ id: 1, name: "Test User" }]);
  });
});
```

---

## Testes End-to-End (E2E)

Para testes E2E, você pode criar uma instância de `TestApp`. Isso permite simular requisições HTTP contra seus controllers sem precisar executar um servidor ativo em uma porta específica.

```typescript
import { describe, expect, it } from "bun:test";
import { Test } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "./app.module";

describe("AppController (E2E)", () => {
  it("/ (GET)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.get("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Hello World!" });
  });

  it("/users (POST)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = await moduleRef.createTestApp();
    const response = await app.post("/users", { name: "New User" });

    expect(response.status).toBe(201);
  });
});
```

### Métodos de `TestApp`

O wrapper `TestApp` oferece suporte a todos os métodos HTTP padrão:

- `app.get(path, options?)`
- `app.post(path, body, options?)`
- `app.put(path, body, options?)`
- `app.patch(path, body, options?)`
- `app.delete(path, options?)`

Todos os métodos retornam um objeto `Response` padrão.

---

## Testando CQRS

Como os handlers de CQRS são resolvidos a partir do contêiner de DI, você pode facilmente mocká-los ou até mesmo os próprios buses.

```typescript
it("deve mockar um command handler", async () => {
  const mockHandler = {
    execute: (command) => {
      /* implementação mockada */
    },
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CreateUserHandler)
    .useValue(mockHandler)
    .compile();

  // ...
});
```

## Isolamento

O utilitário `Test.createTestingModule()` limpa automaticamente o `GlobalRegistry` e o estado interno antes da compilação, garantindo que os testes permaneçam isolados entre si.
