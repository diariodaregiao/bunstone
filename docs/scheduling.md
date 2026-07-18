# Scheduling

Bunstone runs periodic and delayed tasks with decorators on your providers. The scheduler starts jobs when the app boots and stops them on shutdown. Decorate methods on any `@Injectable` provider registered in a module's `providers`.

## @Cron

Runs a method on a cron schedule using native `Bun.cron`. Expressions are **5-field** (minute, hour, day-of-month, month, day-of-week) and evaluated in **UTC**.

```ts
import { Injectable, Cron } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ReportService {
  @Cron("*/5 * * * *")
  everyFiveMinutes() {
    console.log("running report");
  }
}
```

An invalid cron expression throws at startup.

## @Interval

Runs a method repeatedly every `ms` milliseconds.

```ts
import { Injectable, Interval } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class HealthCheck {
  @Interval(30_000)
  ping() {
    console.log("still alive");
  }
}
```

## @Timeout

Runs a method once, `ms` milliseconds after startup.

```ts
import { Injectable, Timeout } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class Warmup {
  @Timeout(5_000)
  prime() {
    console.log("warming caches");
  }
}
```

## Behavior

- **Stop on shutdown** — all cron jobs, intervals, and timeouts are cleared when the application closes.
- **Overlap guard** — a job will not start again while its previous run is still in progress; overlapping ticks are skipped.
- **Error isolation** — if a job throws, the error is logged and the failure does not affect other scheduled jobs.
