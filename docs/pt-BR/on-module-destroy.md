# OnModuleDestroy

`OnModuleDestroy` é uma interface de ciclo de vida para lógica de limpeza.

`onModuleDestroy()` é executado no próprio hook `onStop` do Elysia, que é o hook de ciclo de vida para o encerramento da aplicação (fim do ciclo de vida).

## Uso Básico

```typescript
import {
  AppStartup,
  Injectable,
  Module,
} from "@grupodiariodaregiao/bunstone";
import type { OnModuleDestroy } from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppCleanupService implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    // close resources, flush queues, etc.
  }
}

@Module({
  providers: [AppCleanupService],
})
class AppModule {}
```

## Observações

- Use isso apenas em providers registrados em `@Module({ providers: [...] })`.
- O método é aguardado antes de o ciclo de parada do Elysia ser concluído.
