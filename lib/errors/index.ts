// ─── Base ────────────────────────────────────────────────────────────────────

/**
 * Base class for all Bunstone framework errors.
 *
 * Every error carries:
 * - `code` – a stable, searchable error identifier (e.g. `BNS-DI-001`)
 * - `suggestion` – a human-readable hint on how to fix the problem
 * - `context` – structured data that adds traceability
 * - `cause` – the underlying error that triggered this one (if any)
 */
export abstract class BunstoneError extends Error {
	public readonly code: string;
	public readonly suggestion?: string;
	public readonly context?: Record<string, unknown>;
	public override readonly cause?: Error;

	constructor(
		message: string,
		code: string,
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, cause ? { cause } : undefined);
		this.name = this.constructor.name;
		this.code = code;
		this.suggestion = suggestion;
		this.context = context;
		this.cause = cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

// ─── Dependency Injection ─────────────────────────────────────────────────────

/**
 * Thrown when a dependency cannot be resolved during DI container setup.
 *
 * Codes:
 * - `BNS-DI-001` – type is `undefined` (often due to `import type` on a class)
 * - `BNS-DI-002` – type resolves to `Object` (emitDecoratorMetadata + circular dep)
 * - `BNS-DI-003` – generic resolution failure
 */
export class DependencyResolutionError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-DI-001" | "BNS-DI-002" | "BNS-DI-003" = "BNS-DI-003",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	/** Type resolved to `undefined` – most often caused by `import type` on an injected class. */
	static undefinedType(resolutionStack: string): DependencyResolutionError {
		return new DependencyResolutionError(
			`Cannot resolve dependency: type is \`undefined\` in chain [${resolutionStack}].`,
			"BNS-DI-001",
			[
				"This usually happens when you use `import type` on a class that is injected via DI.",
				"Replace `import type { MyService }` with `import { MyService }` in affected files.",
				"Also check for circular dependencies between your providers.",
			].join("\n  "),
			{ resolutionStack },
		);
	}

	/** Type resolved to the base `Object` class – decorator metadata is misconfigured. */
	static objectType(resolutionStack: string): DependencyResolutionError {
		return new DependencyResolutionError(
			`Cannot resolve dependency: type resolved to \`Object\` in chain [${resolutionStack}].`,
			"BNS-DI-002",
			[
				"Ensure `emitDecoratorMetadata: true` and `experimentalDecorators: true` are set in tsconfig.json.",
				"This error can also be caused by a circular dependency. Check the resolution chain above.",
				"Make sure injected classes are imported as values, not as types (`import type`).",
			].join("\n  "),
			{ resolutionStack },
		);
	}

	/** Generic DI failure with a custom message. */
	static generic(
		message: string,
		context?: Record<string, unknown>,
		cause?: Error,
	): DependencyResolutionError {
		return new DependencyResolutionError(
			message,
			"BNS-DI-003",
			"Ensure all providers are decorated with @Injectable() and listed in the `providers` array of the owning @Module().",
			context,
			cause,
		);
	}
}

// ─── Module ───────────────────────────────────────────────────────────────────

/**
 * Thrown when a module fails to initialise (provider wiring, metadata errors, etc.).
 *
 * Codes:
 * - `BNS-MOD-001` – generic module init failure
 * - `BNS-MOD-002` – unsupported HTTP method registered on a controller
 */
export class ModuleInitializationError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-MOD-001" | "BNS-MOD-002" = "BNS-MOD-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static providersFailed(
		context?: Record<string, unknown>,
		cause?: Error,
	): ModuleInitializationError {
		return new ModuleInitializationError(
			"Failed to initialize one or more providers in this module.",
			"BNS-MOD-001",
			[
				"Ensure all providers are decorated with @Injectable().",
				"Check for circular dependencies between providers.",
				"Verify that imported modules export the providers you depend on.",
			].join("\n  "),
			context,
			cause,
		);
	}

	static unsupportedHttpMethod(method: string): ModuleInitializationError {
		return new ModuleInitializationError(
			`HTTP method "${method}" is not supported by the underlying adapter.`,
			"BNS-MOD-002",
			"Use standard HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.",
			{ method },
		);
	}
}

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Thrown when the application is misconfigured at startup or at the time a feature
 * is first used.
 *
 * Codes:
 * - `BNS-CFG-001` – missing or invalid configuration
 * - `BNS-CFG-002` – feature used before the required module was registered
 */
export class ConfigurationError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-CFG-001" | "BNS-CFG-002" = "BNS-CFG-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static missingModule(
		featureName: string,
		registerCall: string,
	): ConfigurationError {
		return new ConfigurationError(
			`${featureName} is not configured. The required module was never registered.`,
			"BNS-CFG-002",
			`Call \`${registerCall}\` in your root AppModule imports before using this feature.`,
			{ feature: featureName },
		);
	}
}

// ─── CQRS ─────────────────────────────────────────────────────────────────────

/**
 * Thrown by the CQRS buses when a handler is not found.
 *
 * Codes:
 * - `BNS-CQRS-001` – no handler registered for a command
 * - `BNS-CQRS-002` – no handler registered for a query
 * - `BNS-CQRS-003` – no handler registered for an event
 */
export class CqrsError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-CQRS-001" | "BNS-CQRS-002" | "BNS-CQRS-003" = "BNS-CQRS-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static noCommandHandler(commandName: string): CqrsError {
		return new CqrsError(
			`No handler found for command: ${commandName}.`,
			"BNS-CQRS-001",
			[
				`Create a class decorated with @CommandHandler(${commandName}) that implements ICommandHandler<${commandName}>.`,
				`Register it in the \`providers\` array of the module where you use CommandBus.`,
			].join("\n  "),
			{ command: commandName },
		);
	}

	static noQueryHandler(queryName: string): CqrsError {
		return new CqrsError(
			`No handler found for query: ${queryName}.`,
			"BNS-CQRS-002",
			[
				`Create a class decorated with @QueryHandler(${queryName}) that implements IQueryHandler<${queryName}>.`,
				`Register it in the \`providers\` array of the module where you use QueryBus.`,
			].join("\n  "),
			{ query: queryName },
		);
	}

	static noEventHandler(eventName: string): CqrsError {
		return new CqrsError(
			`No handler found for event: ${eventName}.`,
			"BNS-CQRS-003",
			[
				`Create a class decorated with @EventHandler(${eventName}) that implements IEventHandler<${eventName}>.`,
				`Register it in the \`providers\` array of the module where EventBus is used.`,
			].join("\n  "),
			{ event: eventName },
		);
	}
}

// ─── Database ─────────────────────────────────────────────────────────────────

/**
 * Thrown when database operations fail.
 *
 * Codes:
 * - `BNS-DB-001` – SQL instance not initialised
 * - `BNS-DB-002` – query / transaction execution failed
 */
export class DatabaseError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-DB-001" | "BNS-DB-002" = "BNS-DB-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static notInitialized(): DatabaseError {
		return new DatabaseError(
			"SQL instance is not initialized. You must register the module before running queries.",
			"BNS-DB-001",
			[
				"Call SqlModule.register(connectionStringOrOptions) inside your root AppModule imports.",
				"Example: @Module({ imports: [SqlModule.register('postgresql://user:pass@host/db')] })",
			].join("\n  "),
		);
	}
}

// ─── BullMQ ───────────────────────────────────────────────────────────────────

/**
 * Thrown when BullMQ operations fail.
 *
 * Codes:
 * - `BNS-MQ-001` – Redis options not configured
 * - `BNS-MQ-002` – queue not found or could not be created
 */
export class BullMQError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-MQ-001" | "BNS-MQ-002" = "BNS-MQ-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static notConfigured(): BullMQError {
		return new BullMQError(
			"BullMQ Redis options are not configured.",
			"BNS-MQ-001",
			[
				"Call BullMqModule.register({ redis: { host, port } }) in your root AppModule imports.",
				"Example: @Module({ imports: [BullMqModule.register({ redis: { host: 'localhost', port: 6379 } })] })",
			].join("\n  "),
		);
	}

	static queueFailed(queueName: string, cause?: Error): BullMQError {
		return new BullMQError(
			`Failed to create or access BullMQ queue "${queueName}".`,
			"BNS-MQ-002",
			[
				"Verify that the Redis server is running and accessible.",
				"Check that the Redis connection options passed to BullMqModule.register() are correct.",
			].join("\n  "),
			{ queueName },
			cause,
		);
	}
}

// ─── RabbitMQ ─────────────────────────────────────────────────────────────────

/**
 * Thrown when RabbitMQ operations fail.
 *
 * Codes:
 * - `BNS-RMQ-001` – module not configured
 * - `BNS-RMQ-002` – connection failed
 * - `BNS-RMQ-003` – topology assertion failed (exchange/queue)
 */
export class RabbitMQError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-RMQ-001" | "BNS-RMQ-002" | "BNS-RMQ-003" = "BNS-RMQ-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static notConfigured(): RabbitMQError {
		return new RabbitMQError(
			"RabbitMQModule is not configured.",
			"BNS-RMQ-001",
			[
				"Call RabbitMQModule.register({ ... }) in your root AppModule imports.",
				"Example: @Module({ imports: [RabbitMQModule.register({ uri: 'amqp://localhost' })] })",
			].join("\n  "),
		);
	}

	static connectionFailed(attempts: number, cause?: Error): RabbitMQError {
		return new RabbitMQError(
			`Could not connect to RabbitMQ after ${attempts} attempt(s).`,
			"BNS-RMQ-002",
			[
				"Make sure the RabbitMQ server is running and reachable from this host.",
				"Double-check the host, port, username, password, and vhost in RabbitMQModule.register().",
				"If using Docker, ensure the container is healthy and the port is exposed.",
			].join("\n  "),
			{ attempts },
			cause,
		);
	}

	static topologyFailed(
		resource: string,
		resourceName: string,
		cause?: Error,
	): RabbitMQError {
		return new RabbitMQError(
			`Failed to assert ${resource} "${resourceName}" on RabbitMQ.`,
			"BNS-RMQ-003",
			[
				`Verify that the ${resource} configuration passed to RabbitMQModule.register() is correct.`,
				"Check that the RabbitMQ user has the required permissions.",
				`If the ${resource} already exists on the broker with different settings, either delete it or match the existing configuration.`,
			].join("\n  "),
			{ resource, resourceName },
			cause,
		);
	}
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

/**
 * Thrown when a scheduling decorator receives invalid arguments.
 *
 * Codes:
 * - `BNS-SCHED-001` – invalid or missing cron expression
 * - `BNS-SCHED-002` – invalid timeout delay
 */
export class ScheduleError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-SCHED-001" | "BNS-SCHED-002" = "BNS-SCHED-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static invalidCron(expression?: string): ScheduleError {
		return new ScheduleError(
			`Invalid or empty cron expression${expression ? `: "${expression}"` : ""}.`,
			"BNS-SCHED-001",
			[
				"Provide a valid 5 or 6-field cron expression to @Cron().",
				'Examples: @Cron("0 * * * *")  // every hour',
				'         @Cron("*/5 * * * *") // every 5 minutes',
				"Use https://crontab.guru to generate and validate cron expressions.",
			].join("\n  "),
			expression ? { expression } : undefined,
		);
	}

	static invalidDelay(delay: number): ScheduleError {
		return new ScheduleError(
			`Invalid timeout delay: ${delay}. Delay must be a positive number (milliseconds).`,
			"BNS-SCHED-002",
			[
				"Pass a positive integer (ms) to @Timeout().",
				"Example: @Timeout(5000) // fires once after 5 seconds",
			].join("\n  "),
			{ delay },
		);
	}
}

// ─── Testing ──────────────────────────────────────────────────────────────────

/**
 * Thrown by the testing utilities when setup is incorrect.
 *
 * Codes:
 * - `BNS-TEST-001` – provider not found in the testing module
 */
export class TestingError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-TEST-001" = "BNS-TEST-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static providerNotFound(providerName: string): TestingError {
		return new TestingError(
			`Provider "${providerName}" was not found in the TestingModule.`,
			"BNS-TEST-001",
			[
				`Ensure "${providerName}" is listed in the \`providers\` array of the module passed to TestingModuleBuilder.`,
				"If you want to override it, call .overrideProvider() before .compile().",
				"Example: const module = await TestingModuleBuilder.create(AppModule).compile();",
			].join("\n  "),
			{ provider: providerName },
		);
	}
}

// ─── Rate Limit ───────────────────────────────────────────────────────────────

/**
 * Thrown when rate-limit storage operations fail unexpectedly.
 *
 * Codes:
 * - `BNS-RL-001` – Redis transaction failed
 * - `BNS-RL-002` – Invalid response from Redis
 */
export class RateLimitError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-RL-001" | "BNS-RL-002" = "BNS-RL-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static transactionFailed(cause?: Error): RateLimitError {
		return new RateLimitError(
			"Failed to execute atomic Redis transaction for rate limiting.",
			"BNS-RL-001",
			[
				"Check that the Redis client passed to RedisStorage is connected and healthy.",
				"Verify that the Redis server supports MULTI/EXEC commands (standard in Redis ≥ 1.2).",
			].join("\n  "),
			undefined,
			cause,
		);
	}

	static invalidResponse(): RateLimitError {
		return new RateLimitError(
			"Received an invalid or unexpected response from the Redis MULTI/EXEC transaction.",
			"BNS-RL-002",
			[
				"This may indicate a version incompatibility between your Redis client library and the server.",
				"Ensure the Redis client implements the RedisClientLike interface correctly.",
			].join("\n  "),
		);
	}
}

// ─── Upload / S3 ──────────────────────────────────────────────────────────────

/**
 * Thrown when file upload operations fail.
 *
 * Codes:
 * - `BNS-S3-001` – invalid or empty S3 object path
 * - `BNS-S3-002` – upload operation failed
 */
export class UploadError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-S3-001" | "BNS-S3-002" = "BNS-S3-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static emptyPath(): UploadError {
		return new UploadError(
			"S3 object path cannot be empty.",
			"BNS-S3-001",
			[
				"Provide a non-empty string path to UploadAdapter.upload().",
				'Example: await uploadAdapter.upload({ path: "images/avatar.png", body: file })',
			].join("\n  "),
		);
	}

	static uploadFailed(path: string, cause?: Error): UploadError {
		return new UploadError(
			`Failed to upload object to S3 at path "${path}".`,
			"BNS-S3-002",
			[
				"Verify that the S3/MinIO credentials and endpoint are correct.",
				"Ensure the target bucket exists and the user has write permissions.",
			].join("\n  "),
			{ path },
			cause,
		);
	}
}

// ─── Email ────────────────────────────────────────────────────────────────────

/**
 * Thrown when email sending operations fail.
 *
 * Codes:
 * - `BNS-EMAIL-001` – EmailModule not configured
 * - `BNS-EMAIL-002` – send failed
 */
export class EmailError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-EMAIL-001" | "BNS-EMAIL-002" = "BNS-EMAIL-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static notConfigured(): EmailError {
		return new EmailError(
			"EmailService is not configured. The EmailModule was never registered.",
			"BNS-EMAIL-001",
			[
				"Call EmailModule.register({ host, port, auth: { user, pass } }) in your root AppModule imports.",
				"Example: @Module({ imports: [EmailModule.register({ host: 'smtp.example.com', port: 587, ... })] })",
			].join("\n  "),
		);
	}

	static sendFailed(to: string | string[], cause?: Error): EmailError {
		return new EmailError(
			`Failed to send email to ${Array.isArray(to) ? to.join(", ") : to}.`,
			"BNS-EMAIL-002",
			[
				"Check that the SMTP server is reachable and the credentials are correct.",
				"Verify the recipient address is valid.",
			].join("\n  "),
			{ to: Array.isArray(to) ? to : [to] },
			cause,
		);
	}
}

// ─── HTTP Params ──────────────────────────────────────────────────────────────

/**
 * Thrown when HTTP parameter extraction fails at a framework-internal level
 * (as opposed to validation failures, which use HttpException).
 *
 * Codes:
 * - `BNS-HTTP-001` – FormData not available on this request
 * - `BNS-HTTP-002` – could not read multipart form data
 */
export class HttpParamError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-HTTP-001" | "BNS-HTTP-002" = "BNS-HTTP-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static formDataUnavailable(): HttpParamError {
		return new HttpParamError(
			"FormData is not available on this request.",
			"BNS-HTTP-001",
			[
				"Ensure the route handler that uses @FormData() receives a multipart/form-data request.",
				"Check that the HTTP adapter (Elysia) is not consuming the request body before Bunstone reads it.",
			].join("\n  "),
		);
	}

	static formDataReadFailed(reason: string, cause?: Error): HttpParamError {
		return new HttpParamError(
			`Could not read multipart form data from the request: ${reason}`,
			"BNS-HTTP-002",
			[
				"Ensure the client sends a proper multipart/form-data payload.",
				"The request body may have been consumed by another middleware. Make sure no other handler reads the body first.",
			].join("\n  "),
			{ reason },
			cause,
		);
	}
}

// ─── Guard ────────────────────────────────────────────────────────────────────

/**
 * Thrown when a guard is misconfigured.
 *
 * Codes:
 * - `BNS-GRD-001` – generic guard configuration error
 */
export class GuardError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-GRD-001" = "BNS-GRD-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Thrown when a built-in adapter (cache, upload, etc.) encounters an error.
 *
 * Codes:
 * - `BNS-ADP-001` – invalid data stored in cache
 * - `BNS-ADP-002` – adapter operation failed
 */
export class AdapterError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-ADP-001" | "BNS-ADP-002" = "BNS-ADP-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}
}
