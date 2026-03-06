# Módulo SQL

O Bunstone fornece um módulo SQL nativo que encapsula o [cliente SQL nativo do Bun](https://bun.sh/docs/api/sql). Ele foi projetado para ficar disponível globalmente após o registro.

## Instalação

O módulo SQL faz parte do pacote principal `@grupodiariodaregiao/bunstone`.

## Registro

Para usar o módulo SQL, você deve registrá-lo no seu `AppModule` raiz usando o método `SqlModule.register()`.

### Exemplo de registro

```typescript
import { Module, SqlModule } from "@grupodiariodaregiao/bunstone";
import { AppController } from "./app.controller";

@Module({
  imports: [
    SqlModule.register({
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
      database: "my_db",
      provider: "postgresql",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

OU usando uma string de conexão:

```typescript
@Module({
  imports: [
    SqlModule.register("postgresql://user:password@localhost:5432/my_db"),
  ],
})
export class AppModule {}
```

## Uso

Depois de registrado, o `SqlService` fica disponível globalmente. Você pode injetá-lo em qualquer controller ou provider sem precisar importar o `SqlModule` nos módulos subsequentes.

### Injetando o SqlService

```typescript
import { Injectable, SqlService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UserService {
  constructor(private readonly sqlService: SqlService) {}

  async getUsers() {
    // Consulta básica
    return await this.sqlService.query("SELECT * FROM users");
  }

  async getUserById(id: number) {
    // Consulta parametrizada por segurança
    return await this.sqlService.query("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
  }
}
```

## Disponibilidade global

Como o `SqlModule` é configurado com `global: true`, qualquer provider dentro dele (como o `SqlService`) fica disponível em toda a aplicação. Você só precisa registrá-lo uma vez no seu módulo raiz.

## Exemplo prático

Veja como registrar e usar o módulo SQL em um controller:

<<< @/../examples/05-database-sql/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/05-database-sql/index.ts)
