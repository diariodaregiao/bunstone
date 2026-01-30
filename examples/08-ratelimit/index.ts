import {
  Module,
  Controller,
  Get,
  Post,
  AppStartup,
  RateLimit,
  MemoryStorage,
} from "../../index";

/**
 * Example demonstrating Rate Limiting features
 * 
 * Features:
 * - Endpoint-level rate limiting with @RateLimit()
 * - Global rate limiting configuration
 * - Custom rate limit messages
 * - Rate limit headers in responses
 */

@Controller("api")
class ApiController {
  /**
   * Public endpoint with strict rate limit (5 requests per minute)
   * Returns rate limit headers:
   * - X-RateLimit-Limit: 5
   * - X-RateLimit-Remaining: 4 (decreases with each request)
   * - X-RateLimit-Reset: timestamp
   */
  @Get("public")
  @RateLimit({ max: 5, windowMs: 60000, message: "Too many requests. Please slow down." })
  getPublic() {
    return { message: "This endpoint is rate limited to 5 requests per minute" };
  }

  /**
   * Premium endpoint with higher rate limit (100 requests per minute)
   */
  @Get("premium")
  @RateLimit({ max: 100, windowMs: 60000 })
  getPremium() {
    return { message: "Premium users get 100 requests per minute" };
  }

  /**
   * Write operation with very strict limit (3 requests per minute)
   */
  @Post("create")
  @RateLimit({ max: 3, windowMs: 60000 })
  createResource() {
    return { message: "Resource created", id: "123" };
  }

  /**
   * Unprotected endpoint - no rate limit applied
   */
  @Get("unlimited")
  getUnlimited() {
    return { message: "This endpoint has no rate limiting" };
  }
}

@Module({
  controllers: [ApiController],
})
class AppModule {}

// Example 1: No global rate limit (only decorator-based limits)
const app1 = await AppStartup.create(AppModule);
console.log("Example 1: Decorator-only rate limits");

// Example 2: With global rate limit (applies to ALL endpoints)
const app2 = await AppStartup.create(AppModule, {
  rateLimit: {
    enabled: true,
    max: 1000,        // 1000 requests per window
    windowMs: 60000,  // per minute
    message: "Global rate limit exceeded",
  },
});
console.log("Example 2: Global rate limit (1000 req/min for all endpoints)");

// Example 3: Custom storage (Redis example - requires Redis connection)
// const redisClient = new Redis(); // from 'ioredis' or 'redis'
// const app3 = await AppStartup.create(AppModule, {
//   rateLimit: {
//     enabled: true,
//     max: 100,
//     windowMs: 60000,
//     storage: new RedisStorage(redisClient), // For multi-instance deployments
//   },
// });

// Start the server
const app = await AppStartup.create(AppModule);
app.listen(3000);
console.log("Rate limiting example running on http://localhost:3000");
console.log("");
console.log("Endpoints:");
console.log("  GET  /api/public     - 5 req/min (decorator limit)");
console.log("  GET  /api/premium    - 100 req/min (decorator limit)");
console.log("  POST /api/create     - 3 req/min (decorator limit)");
console.log("  GET  /api/unlimited  - No rate limit");
console.log("");
console.log("Response headers include:");
console.log("  X-RateLimit-Limit     - Maximum requests allowed");
console.log("  X-RateLimit-Remaining - Remaining requests in window");
console.log("  X-RateLimit-Reset     - Unix timestamp when window resets");
console.log("  Retry-After           - Seconds to wait (only when 429)");
