# Agendamento

O Bunstone oferece suporte a agendamento baseado em decorators para tarefas em segundo plano.

## @Timeout()

Executa um método uma vez após um atraso especificado (em milissegundos).

```typescript
@Injectable()
export class TaskService {
  @Timeout(5000)
  runOnce() {
    console.log("Executado após 5 segundos");
  }
}
```

## @Cron()

Executa um método repetidamente com base em uma expressão cron.

```typescript
import { Cron } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class CleanupService {
  @Cron("0 0 * * *") // Todos os dias à meia-noite
  handleCleanup() {
    console.log("Limpando banco de dados...");
  }
}
```

> **Observação**: Os decorators de agendamento funcionam em qualquer classe `@Injectable` que esteja registrada como `provider` em um `@Module`.

## Exemplo prático

Explore mais opções e configurações de agendamento:

<<< @/../examples/06-scheduling/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/06-scheduling/index.ts)
