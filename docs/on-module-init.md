# OnModuleInit

`OnModuleInit` is a lifecycle interface for providers that need startup logic.

When a module is initialized, Bunstone executes `onModuleInit()` for providers that implement `OnModuleInit`.

## Basic Usage

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

## Async Initialization

`onModuleInit()` can be async:

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

## Notes

- Use it only in providers registered in `@Module({ providers: [...] })`.
- The method is awaited during app/module startup.
