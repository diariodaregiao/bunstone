# CQRS & Sagas

Bunstone provides a full implementation of the Command Query Responsibility Segregation (CQRS) pattern.

## Registration

To use CQRS features, you must import the `CqrsModule` in your root `AppModule`. Since it is a **Global Module**, the buses will be available for injection in all other modules.

```typescript
import { Module, CqrsModule } from "@diariodaregiao/bunstone";

@Module({
  imports: [CqrsModule],
})
export class AppModule {}
```

## Command Bus

Commands are used to perform actions that change the state of the application.

```typescript
// 1. Define Command
class CreateUserCommand implements ICommand {
  constructor(public readonly name: string) {}
}

// 2. Define Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand) {
    // logic to create user
    return { id: 1, name: command.name };
  }
}

// 3. Execute
const result = await commandBus.execute(new CreateUserCommand("John"));
```

## Query Bus

Queries are used to retrieve data without changing state.

```typescript
@QueryHandler(GetUserQuery)
class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    return { id: query.id, name: "John" };
  }
}
```

## Event Bus

Events are used to notify other parts of the system that something has happened.

```typescript
@EventsHandler(UserCreatedEvent)
class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    console.log(`User created: ${event.userId}`);
  }
}
```

## Sagas

Sagas are long-running processes that react to events and can trigger new commands. They use a reactive stream approach.

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

## Practical Example

For a complete working example of CQRS with commands and handlers, see:

<<< @/../examples/04-cqrs/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/04-cqrs/index.ts)
