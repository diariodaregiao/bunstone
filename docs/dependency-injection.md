# Dependency Injection

Bunstone uses a powerful Dependency Injection (DI) system that manages the lifecycle of your classes and their dependencies.

## @Injectable()

To make a class injectable, use the `@Injectable()` decorator.

```typescript
import { Injectable } from "@diariodaregiao/bunstone";

@Injectable()
export class DatabaseService {
  query(sql: string) {
    return `Executing: ${sql}`;
  }
}
```

## Constructor Injection

Dependencies are automatically resolved and injected via the constructor.

```typescript
@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  findAll() {
    return this.db.query("SELECT * FROM users");
  }
}
```

## Singleton Behavior

By default, all providers are singletons within their module tree. If multiple modules import the same module, they will share the same instances of exported providers.

## Module Merging

When you import a module into another, Bunstone merges the `injectables` to ensure that shared services (like a `CommandBus` or a `DatabaseConnection`) remain singletons across the entire application.

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

## Global Modules

Sometimes you may want a provider to be available everywhere without importing its module into every other module. You can achieve this by setting the `global` property to `true` in the `@Module` decorator.

```typescript
@Module({
  providers: [GlobalService],
  global: true,
})
export class GlobalModule {}
```

Once a global module is registered in the root `AppModule`, its providers can be injected into any class in the application without further imports.

> [!TIP] > `SqlModule` and `CqrsModule` are examples of global modules provided by Bunstone.
