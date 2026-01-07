# Scheduling

Bunstone supports decorator-based scheduling for background tasks.

## @Timeout()

Executes a method once after a specified delay (in milliseconds).

```typescript
@Injectable()
export class TaskService {
  @Timeout(5000)
  runOnce() {
    console.log("Executed after 5 seconds");
  }
}
```

## @Cron()

Executes a method repeatedly based on a cron expression.

```typescript
import { Cron } from "@diariodaregiao/bunstone";

@Injectable()
export class CleanupService {
  @Cron("0 0 * * *") // Every day at midnight
  handleCleanup() {
    console.log("Cleaning up database...");
  }
}
```

> **Note**: Scheduling decorators work on any `@Injectable` class that is registered as a `provider` in a `@Module`.

## Practical Example

Explore more scheduling options and configurations:

<<< @/../examples/06-scheduling/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/06-scheduling/index.ts)
