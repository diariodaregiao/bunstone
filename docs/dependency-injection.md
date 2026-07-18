# Dependency Injection

Bunstone resolves classes and their dependencies through a container. Providers are constructed once and cached, so every consumer shares the same singleton instance within an application.

## @Injectable()

Mark a class as injectable so it can be constructed by the container and receive dependencies.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class GreetService {
  greet(name: string) {
    return `hello ${name}`;
  }
}
```

## Constructor injection

Declare dependencies as constructor parameters. Their types are read from decorator metadata and resolved automatically.

```ts
import { Injectable } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class UsersService {
  constructor(private readonly greet: GreetService) {}

  welcome(name: string) {
    return this.greet.greet(name);
  }
}
```

## Injection tokens

Non-class dependencies (config objects, interfaces, primitives) are keyed by an `InjectionToken`. Use `@Inject(TOKEN)` to point a parameter at the token.

```ts
import { Inject, Injectable, InjectionToken } from "@grupodiariodaregiao/bunstone";

interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>("AppConfig");

@Injectable()
export class ApiClient {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  base() {
    return this.config.apiUrl;
  }
}
```

## Provider forms

Providers are declared in a module's `providers` array. A bare class is shorthand for `{ provide: Class, useClass: Class }`. The other forms bind a token to a value, a class, or a factory.

```ts
@Module({
  providers: [
    GreetService,
    { provide: APP_CONFIG, useValue: { apiUrl: "https://api.example.com" } },
    { provide: GreetService, useClass: GreetService },
    {
      provide: ApiClient,
      useFactory: (config: AppConfig) => new ApiClient(config),
      inject: [APP_CONFIG],
    },
  ],
})
export class AppModule {}
```

The `inject` array lists the tokens that are resolved and passed, in order, to `useFactory`.

## Singletons

Each token resolves to a single instance for the life of the application. Two services that depend on the same provider receive the exact same object.

```ts
container.resolve(A).shared === container.resolve(B).shared; // true
```

## Cycle detection

If two providers depend on each other, the container throws a clear circular-dependency error instead of overflowing the stack.

```ts
const A = new InjectionToken("A");
const B = new InjectionToken("B");

container.register({ provide: A, useFactory: (b) => ({ b }), inject: [B] });
container.register({ provide: B, useFactory: (a) => ({ a }), inject: [A] });

container.resolve(A); // throws: Circular dependency
```
