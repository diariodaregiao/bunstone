# CQRS e Sagas

O Bunstone fornece uma implementação completa do padrão Command Query Responsibility Segregation (CQRS).

## Registro

Para usar os recursos de CQRS, você deve importar o `CqrsModule` no seu `AppModule` raiz. Como ele é um **Módulo Global**, os buses estarão disponíveis para injeção em todos os outros módulos.

```typescript
import { Module, CqrsModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CqrsModule],
})
export class AppModule {}
```

## Command Bus

Commands são usados para executar ações que alteram o estado da aplicação.

```typescript
// 1. Defina o Command
class CreateUserCommand implements ICommand {
  constructor(public readonly name: string) {}
}

// 2. Defina o Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand) {
    // lógica para criar usuário
    return { id: 1, name: command.name };
  }
}

// 3. Execute
const result = await commandBus.execute(new CreateUserCommand("John"));
```

## Query Bus

Queries são usadas para recuperar dados sem alterar o estado.

```typescript
@QueryHandler(GetUserQuery)
class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    return { id: query.id, name: "John" };
  }
}
```

## Event Bus

Events são usados para notificar outras partes do sistema de que algo aconteceu.

```typescript
@EventsHandler(UserCreatedEvent)
class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    console.log(`Usuário criado: ${event.userId}`);
  }
}
```

## Sagas

Sagas são processos de longa duração que reagem a eventos e podem disparar novos commands. Elas usam uma abordagem de fluxo reativo.

```typescript
@Injectable()
export class UserSaga {
  @Saga()
  onUserCreated = (events$: IEventStream) =>
    events$.pipe(
      ofType(UserCreatedEvent),
      map((event) => new SendWelcomeEmailCommand(event.email))
    );
}
```

## Exemplo prático

Para um exemplo completo e funcional de CQRS com commands e handlers, veja:

<<< @/../examples/04-cqrs/index.ts

[Veja no GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/04-cqrs/index.ts)
