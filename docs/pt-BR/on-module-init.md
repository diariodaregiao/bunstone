# OnModuleInit

`OnModuleInit` é uma interface de ciclo de vida para providers que precisam de lógica de inicialização.

Quando um módulo é inicializado, o Bunstone executa `onModuleInit()` para providers que implementam `OnModuleInit`.

## Uso Básico

```typescript
import { Injectable, Module } from "@grupodiariodaregiao/bunstone";
import type { OnModuleInit } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppInitService implements OnModuleInit {
  onModuleInit(): void {
    console.log("Module initialized");
  }
}

@Module({
  providers: [AppInitService],
})
export class AppModule {}
```

## Inicialização Assíncrona

`onModuleInit()` pode ser assíncrono:

```typescript
@Injectable()
class CacheWarmupService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.loadCache();
  }

  private async loadCache() {
    // startup logic
  }
}
```

## Observações

- Use isso apenas em providers registrados em `@Module({ providers: [...] })`.
- O método é aguardado durante a inicialização da aplicação/do módulo.
