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
]);

// ── Value exports (present at runtime) ────────────────────────────────────

/**
 * All value names shipped in the bundle.
 * Keep in sync with `index.ts`.
 */
export const VALUE_EXPORTS: ReadonlyArray<string> = [
	// adapters
	"CacheAdapter",
	"FormDataAdapter",
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
	// rate limit
	"RateLimit",
	"RateLimitGuard",
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
	"UseGuards",
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
	// http-methods
	"HttpMethod",
	// http-params
	"Body",
	"Param",
	"Query",
	"Headers",
	"Req",
	"Res",
	"FormData",
	// injectable
	"Injectable",
	// jwt
	"Jwt",
	"JwtModule",
	"JwtService",
	"UseJwt",
	// module
	"Module",
	// on-module
	"OnModuleInit",
	"OnModuleDestroy",
	// openapi
	"ApiTags",
	"ApiOperation",
	"ApiResponse",
	"ApiBody",
	// render
	"Render",
	// schedule
	"Cron",
	"Timeout",
	// testing
	"Test",
	"TestingModuleBuilder",
	"TestApp",
	// logger
	"Logger",
];
