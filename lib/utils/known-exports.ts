/**
 * Catalogue of every public name exported from the bunstone package,
 * split by whether it is a **value** (present at runtime) or a **type**
 * (erased at compile-time, absent from the JS bundle).
 *
 * Used by the `bunstone run` CLI command to produce "did you mean?" hints
 * when Bun throws `SyntaxError: Export named 'X' not found`.
 */

// ── Type-only exports (erased at runtime) ─────────────────────────────────

/** Names that are exported with `export type` – they do NOT exist in the JS bundle. */
export const TYPE_ONLY_EXPORTS: ReadonlySet<string> = new Set([
	// rabbitmq-message.interface
	"RabbitMessage",
	"RabbitPublishOptions",
	"RabbitSubscribeOptions",
	"DeadLetterMessage",
	"DeadLetterDeathInfo",
	"RequeueOptions",
	// rabbitmq-options.interface
	"RabbitMQExchangeConfig",
	"RabbitMQQueueBinding",
	"RabbitMQQueueConfig",
	"RabbitMQReconnectConfig",
	"RabbitMQModuleOptions",
	// general types
	"HttpRequest",
	"ModuleConfig",
	"Options",
	"GuardContract",
	"OnModuleInit",
	"OnModuleDestroy",
	"EmailConfig",
	"RateLimitConfig",
	"RateLimitHeaders",
	"RateLimitInfo",
	"RateLimitResult",
	"RateLimitStorage",
	"FormDataFields",
	"LoggerOptions",
]);

// ── Value exports (present at runtime) ────────────────────────────────────

/**
 * Common value names intended for public consumption.
 * Keep this list aligned with the documented Bunstone API surface.
 */
export const VALUE_EXPORTS: ReadonlyArray<string> = [
	// adapters
	"CacheAdapter",
	"UploadAdapter",
	// email
	"EmailModule",
	"EmailService",
	"EmailLayout",
	// app
	"AppStartup",
	// components
	"Layout",
	// controller
	"Controller",
	"Get",
	"Post",
	"Put",
	"Patch",
	"Delete",
	"Head",
	"Options",
	"SetResponseHeader",
	// rate limit
	"RateLimit",
	"RateLimitExceededException",
	"MemoryStorage",
	"RedisStorage",
	// cqrs
	"CommandBus",
	"CqrsModule",
	"CommandHandler",
	"EventHandler",
	"QueryHandler",
	"Saga",
	"EventBus",
	"QueryBus",
	// database
	"SqlModule",
	"SqlService",
	// bullmq
	"BullMqModule",
	"QueueService",
	"Processor",
	"Process",
	// rabbitmq
	"RabbitMQModule",
	"RabbitMQService",
	"RabbitMQDeadLetterService",
	"RabbitMQConnection",
	"RabbitConsumer",
	"RabbitSubscribe",
	// errors
	"BunstoneError",
	"DependencyResolutionError",
	"ModuleInitializationError",
	"ConfigurationError",
	"CqrsError",
	"DatabaseError",
	"BullMQError",
	"RabbitMQError",
	"ScheduleError",
	"TestingError",
	"RateLimitError",
	"UploadError",
	"EmailError",
	"HttpParamError",
	"GuardError",
	"AdapterError",
	"ImportError",
	"ErrorFormatter",
	// guard
	"Guard",
	// http-exceptions
	"HttpException",
	"BadRequestException",
	"UnauthorizedException",
	"ForbiddenException",
	"NotFoundException",
	"ConflictException",
	"UnprocessableEntityException",
	"InternalServerErrorException",
	"OkResponse",
	"CreatedResponse",
	"NoContentResponse",
	// http-params
	"Body",
	"Param",
	"Query",
	"Header",
	"Request",
	"FormData",
	"FormDataPayload",
	// injectable
	"Injectable",
	// jwt
	"Jwt",
	"JwtModule",
	"JwtService",
	// module
	"Module",
	// openapi
	"ApiTags",
	"ApiOperation",
	"ApiResponse",
	"ApiHeader",
	"ApiHeaders",
	// render
	"Render",
	// schedule
	"Cron",
	"Timeout",
	// testing
	"Test",
	"TestingModule",
	"TestApp",
	// logger
	"LogLevel",
	"Logger",
];
