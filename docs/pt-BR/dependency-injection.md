# Injeção de Dependência

Bunstone usa um poderoso sistema de Injeção de Dependência (DI) que gerencia o ciclo de vida das suas classes e de suas dependências.

## @Injectable()

Para tornar uma classe injetável, use o decorator `@Injectable()`.

```typescript
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class DatabaseService {
  query(sql: string) {
    return `Executing: ${sql}`;
  }
}
```

## Injeção via Construtor

As dependências são resolvidas e injetadas automaticamente via construtor.

```typescript
@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  findAll() {
    return this.db.query("SELECT * FROM users");
  }
}
```

## Comportamento Singleton

Por padrão, todos os providers são singletons dentro de sua árvore de módulos. Se vários módulos importarem o mesmo módulo, eles compartilharão as mesmas instâncias dos providers exportados.

## Mesclagem de Módulos

Quando você importa um módulo em outro, o Bunstone mescla os `injectables` para garantir que serviços compartilhados (como um `CommandBus` ou uma `DatabaseConnection`) permaneçam singletons em toda a aplicação.

```typescript
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

@Module({
  imports: [SharedModule],
  controllers: [AppController],
})
export class AppModule {}
```

## Módulos Globais

Às vezes, você pode querer que um provider esteja disponível em todos os lugares sem importar seu módulo em todos os outros módulos. Você pode fazer isso definindo a propriedade `global` como `true` no decorator `@Module`.

```typescript
@Module({
  providers: [GlobalService],
  global: true,
})
export class GlobalModule {}
```

Depois que um módulo global é registrado no `AppModule` raiz, seus providers podem ser injetados em qualquer classe da aplicação sem importações adicionais.

> [!TIP]
> `SqlModule` e `CqrsModule` são exemplos de módulos globais fornecidos pelo Bunstone.
