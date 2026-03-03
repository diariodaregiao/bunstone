# OnModuleDestroy

`OnModuleDestroy` is an abstract lifecycle class for cleanup logic.

`onModuleDestroy()` is executed in Elysia's own `onStop` hook, which is the lifecycle hook for application shutdown (end of the lifecycle).

## Basic Usage

```typescript
import {
  AppStartup,
  Injectable,
  Module,
  OnModuleDestroy,
} from "@grupodiariodaregiao/bunstone";

@Injectable()
class AppCleanupService extends OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    // close resources, flush queues, etc.
  }
}

@Module({
  providers: [AppCleanupService],
})
class AppModule {}
```

## Notes

- Use it only in providers registered in `@Module({ providers: [...] })`.
- The method is awaited before Elysia stop lifecycle completes.
