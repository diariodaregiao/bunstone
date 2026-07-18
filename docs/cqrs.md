# CQRS

Bunstone provides Command, Query, and Event buses that route messages to their handlers. `CqrsModule` is a **global** module — register it once and the three buses are injectable everywhere.

## Registration

```ts
import { Module, CqrsModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [CqrsModule.register()],
  providers: [CreateUserHandler, GetUserHandler, UserCreatedHandler],
})
export class AppModule {}
```

Handlers are ordinary providers: define them, then list them in the module's `providers`. Bunstone wires each handler to its bus automatically based on the decorator.

## Commands

Commands change state. A command is a plain class; its handler implements `ICommandHandler` and is annotated with `@CommandHandler(Command)`.

```ts
import { Injectable, CommandBus, CommandHandler } from "@grupodiariodaregiao/bunstone";
import type { ICommandHandler } from "@grupodiariodaregiao/bunstone";

export class CreateUser {
  constructor(readonly name: string) {}
}

@CommandHandler(CreateUser)
@Injectable()
export class CreateUserHandler implements ICommandHandler<CreateUser, { id: string }> {
  execute(command: CreateUser) {
    return { id: `id-${command.name}` };
  }
}
```

Dispatch through the `CommandBus`:

```ts
@Injectable()
export class UsersService {
  constructor(private readonly commandBus: CommandBus) {}

  create(name: string) {
    return this.commandBus.execute<{ id: string }>(new CreateUser(name));
  }
}
```

Executing a command with no registered handler throws.

## Queries

Queries read state without changing it. A handler implements `IQueryHandler` and is annotated with `@QueryHandler(Query)`.

```ts
import { QueryHandler } from "@grupodiariodaregiao/bunstone";
import type { IQueryHandler } from "@grupodiariodaregiao/bunstone";

export class GetUser {
  constructor(readonly id: string) {}
}

@QueryHandler(GetUser)
@Injectable()
export class GetUserHandler implements IQueryHandler<GetUser, { id: string }> {
  execute(query: GetUser) {
    return { id: query.id };
  }
}
```

```ts
const user = await this.queryBus.execute<{ id: string }>(new GetUser("7"));
```

## Events

Events notify the system that something happened. An event can have any number of handlers; each implements `IEventHandler` (note the `handle` method) and is annotated with `@EventHandler(Event)`.

```ts
import { EventHandler } from "@grupodiariodaregiao/bunstone";
import type { IEventHandler } from "@grupodiariodaregiao/bunstone";

export class UserCreated {
  constructor(readonly name: string) {}
}

@EventHandler(UserCreated)
@Injectable()
export class SendWelcome implements IEventHandler<UserCreated> {
  handle(event: UserCreated) {
    console.log(`welcome ${event.name}`);
  }
}
```

Publish through the `EventBus`:

```ts
this.eventBus.publish(new UserCreated("ada"));      // fire and forget
await this.eventBus.publishAndWait(new UserCreated("ada")); // await all handlers
```

Every handler registered for an event runs. Handlers are **isolated**: if one throws, the error is logged and the remaining handlers still run.
