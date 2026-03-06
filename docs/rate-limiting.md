# Rate Limiting

Protect your endpoints against abuse with configurable rate limiting. Bunstone supports request limiting at multiple levels, with in-memory or Redis-backed storage.

## Overview

Bunstone's rate limiting system provides:

- **Multiple configuration levels**: Global, Controller, or Endpoint
- **Flexible storage**: Memory (default) or Redis (production)
- **Smart identification**: IP + Method + Endpoint
- **Automatic headers**: Limit information on every response
- **Customizable messages**: Customize the 429 error message

## Basic Usage

### Per Endpoint with @RateLimit()

Use the `@RateLimit()` decorator to apply specific limits to individual endpoints:

```typescript
import { Controller, Get, Post, RateLimit } from "@grupodiariodaregiao/bunstone";

@Controller("api")
export class ApiController {
  @Get("public")
  @RateLimit({ max: 100, windowMs: 60000 }) // 100 requests/minute
  getPublic() {
    return { data: [] };
  }

  @Post("sensitive")
  @RateLimit({ max: 5, windowMs: 60000 }) // 5 requests/minute (more restrictive)
  createSensitive() {
    return { success: true };
  }
}
```

### Global Configuration

Apply rate limiting across the entire application via `AppStartup.create()`:

```typescript
const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000, // 1000 requests/minute for all endpoints
  },
});
```

## Configuration Options

### @RateLimit() Decorator

```typescript
@RateLimit({
  max: 100,              // Maximum requests within the window
  windowMs: 60000,       // Time window in milliseconds (1 minute)
  message?: string,      // Custom message when exceeded (optional)
  storage?: Storage,     // Custom storage (optional)
  keyGenerator?: fn,     // Function to generate the identification key (optional)
  skipHeader?: string,   // Header that allows bypass (optional)
  skip?: fn              // Function to skip rate limiting (optional)
})
```

### Global Configuration

```typescript
{
  rateLimit: {
    enabled?: boolean,     // Enable/disable global rate limiting
    max?: number,          // Maximum requests (default: 100)
    windowMs?: number,     // Window in ms (default: 60000)
    storage?: Storage,     // Custom storage
    keyGenerator?: fn,     // Custom key generator
    skipHeader?: string,   // Bypass header
    skip?: fn,             // Bypass function
    message?: string       // Error message
  }
}
```

## Storage

### MemoryStorage (Default)

Ideal for development and single-instance applications:

```typescript
// No configuration required - this is the default
@RateLimit({ max: 100, windowMs: 60000 })
```

### RedisStorage

For production applications with multiple instances:

```typescript
import { RedisStorage } from "@grupodiariodaregiao/bunstone";
import Redis from "ioredis"; // or "redis"

const redisClient = new Redis({
  host: "localhost",
  port: 6379,
});

const app = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,
    windowMs: 60000,
    storage: new RedisStorage(redisClient, "ratelimit:"), // optional prefix
  },
});
```

## Response Headers

All responses include informative headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706640000
```

When the limit is exceeded (HTTP 429):

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706640000
Retry-After: 45

{ "status": 429, "message": "Too many requests, please try again later." }
```

## Advanced Use Cases

### Custom Identification Key

By default, the key is `IP:Method:Path`. You can customize it:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  keyGenerator: (req) => {
    // Rate limit by authenticated user instead of IP
    return req.headers["x-user-id"] || req.ip;
  },
})
```

### Bypass via Header

Allow bypass in internal environments:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skipHeader: "x-internal-request", // Requests with this header ignore the limit
})
```

### Conditional Bypass

Custom logic to skip rate limiting:

```typescript
@RateLimit({
  max: 100,
  windowMs: 60000,
  skip: (req) => {
    // Skip for internal IPs
    return req.ip?.startsWith("10.0.0.");
  },
})
```

### Custom Messages

```typescript
@RateLimit({
  max: 5,
  windowMs: 60000,
  message: "You have reached the attempt limit. Please wait 1 minute.",
})
```

## Configuration Hierarchy

Settings are applied in the following precedence order:

1. **`@RateLimit()` decorator** (highest precedence)
2. **Controller configuration** (if implemented)
3. **Global configuration** in `AppStartup.create()`
4. **No rate limit** (default if no configuration is provided)

Merge example:

```typescript
// Global configuration: 1000 req/min
const app = await AppStartup.create(AppModule, {
  rateLimit: { enabled: true, max: 1000, windowMs: 60000 },
});

@Controller("api")
class ApiController {
  @Get("strict")
  @RateLimit({ max: 10 }) // Uses 10 req/min (overrides global)
  strictEndpoint() {}

  @Get("default")
  defaultEndpoint() {} // Uses 1000 req/min (inherits global)
}
```

## Complete Example

<<< @/../examples/08-ratelimit/index.ts

## Production Tips

1. **Use RedisStorage** for multi-instance applications
2. **Configure skipHeader** for health checks and internal monitoring
3. **Adjust windowMs** according to the usage pattern (REST APIs generally use 1 minute)
4. **Monitor the headers** to understand usage patterns
5. **Informative messages** help users understand the limits

## API Reference

### Classes

- `RateLimitService` - Main rate limiting service
- `MemoryStorage` - In-memory implementation
- `RedisStorage` - Redis implementation

### Interfaces

- `RateLimitStorage` - Interface for custom implementations
- `RateLimitConfig` - Rate limit configuration
- `RateLimitInfo` - Usage information
- `RateLimitHeaders` - Response headers

### Decorators

- `@RateLimit(options)` - Applies rate limiting to an endpoint

### Exceptions

- `RateLimitExceededException` - Thrown when the limit is exceeded

[See the full example on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/08-ratelimit/index.ts)
