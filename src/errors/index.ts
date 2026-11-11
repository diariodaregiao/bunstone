function compose(message: string, code: string, suggestion?: string): string {
	const head = `${message} [${code}]`;
	return suggestion ? `${head}\n\n  ${suggestion}` : head;
}

export abstract class BunstoneError extends Error {
	public readonly code: string;
	/** The failure on its own, without the code or the suggestion. */
	public readonly summary: string;
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
		// The code and the suggestion go into `message` because that is what an
		// uncaught error prints and what a logger records. Kept in a property
		// alone, the advice that makes these errors actionable is never seen.
		super(compose(message, code, suggestion), cause ? { cause } : undefined);
		this.summary = message;
		this.name = this.constructor.name;
		this.code = code;
		this.suggestion = suggestion;
		this.context = context;
		this.cause = cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class DependencyResolutionError extends BunstoneError {
	constructor(
		message: string,
		code:
			"BNS-DI-001" | "BNS-DI-002" | "BNS-DI-003" | "BNS-DI-004" = "BNS-DI-003",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

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

	/**
	 * A decorated class whose constructor types are missing: the decorator ran,
	 * so it is the type emission that is off, not a missing `@Injectable()`.
	 */
	static missingParamTypes(className: string): DependencyResolutionError {
		const cwd = typeof process !== "undefined" ? process.cwd() : "unknown";
		return new DependencyResolutionError(
			`Class \`${className}\` has constructor parameters but no decorator metadata was emitted.`,
			"BNS-DI-003",
			[
				"The class is decorated, so TypeScript did not emit its constructor types. Check that:",
				`  - the tsconfig.json of the directory the process starts in (here: ${cwd}) sets`,
				'    `"emitDecoratorMetadata": true` — Bun reads that one, not the file\'s own;',
				'  - `import "reflect-metadata"` runs before any decorated class is loaded (first line of main.ts).',
			].join("\n  "),
			{ class: className, cwd },
		);
	}

	static circular(resolutionStack: string): DependencyResolutionError {
		return new DependencyResolutionError(
			`Circular dependency detected: [${resolutionStack}].`,
			"BNS-DI-002",
			[
				"Break the cycle: extract the shared logic into a third provider both can depend on,",
				"or restructure so the dependency only flows one way.",
			].join("\n  "),
			{ resolutionStack },
		);
	}

	static notRegistered(
		tokenName: string,
		resolutionStack: string,
	): DependencyResolutionError {
		return new DependencyResolutionError(
			`No provider registered for \`${tokenName}\` in chain [${resolutionStack}].`,
			"BNS-DI-003",
			[
				`Add \`${tokenName}\` to the \`providers\` array of a @Module(),`,
				"or register it on the application container before resolving.",
			].join("\n  "),
			{ tokenName, resolutionStack },
		);
	}

	static notVisible(
		tokenName: string,
		requestingModule: string,
		owningModule: string,
	): DependencyResolutionError {
		return new DependencyResolutionError(
			`\`${requestingModule}\` cannot resolve \`${tokenName}\`: it is not part of any module it imports.`,
			"BNS-DI-004",
			[
				`Add \`${tokenName}\` to the \`exports\` array of the module that provides it (\`${owningModule}\`),`,
				`and make sure \`${requestingModule}\` lists that module in its \`imports\`.`,
			].join("\n  "),
			{ tokenName, requestingModule, owningModule },
		);
	}
}

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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; module compilation throws `BNS-MOD-001`/`BNS-MOD-002` directly. */
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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; v1 has no pluggable HTTP adapter. */
	static unsupportedHttpMethod(method: string): ModuleInitializationError {
		return new ModuleInitializationError(
			`HTTP method "${method}" is not supported by the underlying adapter.`,
			"BNS-MOD-002",
			"Use standard HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.",
			{ method },
		);
	}
}

export class ConfigurationError extends BunstoneError {
	constructor(
		message: string,
		code:
			| "BNS-CFG-001"
			| "BNS-CFG-002"
			| "BNS-CFG-003"
			| "BNS-CFG-004"
			| "BNS-CFG-005"
			| "BNS-HTTP-001"
			| "BNS-HTTP-002" = "BNS-CFG-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	/** Bunstone's decorators were compiled as standard (TC39) decorators. */
	static standardDecorators(decorator: string): ConfigurationError {
		const cwd = typeof process !== "undefined" ? process.cwd() : "unknown";
		return new ConfigurationError(
			`${decorator} was compiled as a standard (TC39) decorator, but Bunstone needs TypeScript's legacy decorators.`,
			"BNS-CFG-005",
			[
				"Bun picks the decorator mode from the tsconfig.json of the directory the process starts in",
				`(here: ${cwd}), not from the file's own tsconfig.json. That directory has none, or one`,
				"without the decorator options. Either:",
				"  - start the app (or run `bun build`) from the project directory, e.g. set `WORKDIR` in Docker; or",
				'  - add `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` to that tsconfig.json.',
			].join("\n  "),
			{ decorator, cwd },
		);
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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; publishing an event with no handler is not an error. */
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

export class EventStoreError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-ES-001" | "BNS-ES-002" | "BNS-ES-003" = "BNS-ES-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static versionConflict(
		streamId: string,
		expected: number,
		actual: number,
	): EventStoreError {
		return new EventStoreError(
			`Concurrency conflict on stream "${streamId}": expected version ${expected} but found ${actual}.`,
			"BNS-ES-001",
			[
				"Another writer appended events to this stream first.",
				"Reload the aggregate and retry the operation.",
			].join("\n  "),
			{ streamId, expected, actual },
		);
	}

	static payloadTooLarge(
		streamId: string,
		bytes: number,
		limit: number,
	): EventStoreError {
		return new EventStoreError(
			`Commit for stream "${streamId}" is ${bytes} bytes, over the ${limit} byte limit.`,
			"BNS-ES-002",
			[
				"A commit is stored as one document, so it must fit the backend's document limit.",
				"Split the operation into several appends, or move the bulk of the payload out of the event.",
			].join("\n  "),
			{ streamId, bytes, limit },
		);
	}

	static notSnapshottable(aggregate: string): EventStoreError {
		return new EventStoreError(
			`\`${aggregate}\` cannot be snapshotted: it must implement both \`snapshotState()\` and \`restoreFromState()\`.`,
			"BNS-ES-003",
			[
				"Implement the `Snapshottable` interface on the aggregate,",
				"or drop `snapshotEvery` from the repository options to replay the full stream instead.",
			].join("\n  "),
			{ aggregate },
		);
	}
}

export class DatabaseError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-DB-001" | "BNS-DB-002" | "BNS-DB-003" = "BNS-DB-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; a missing `SqlModule` fails at startup as an unresolved dependency. */
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

	static notConnected(feature: string, register: string): DatabaseError {
		return new DatabaseError(
			`\`${feature}\` is not connected yet.`,
			"BNS-DB-002",
			`Register \`${register}\` in your root module; the connection is opened during application startup.`,
			{ feature },
		);
	}

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; `SqlModule.register()` options are typed. */
	static invalidConfig(
		invalidKeys: string[],
		allowedKeys: readonly string[],
	): DatabaseError {
		return new DatabaseError(
			`Invalid SqlModule option(s): ${invalidKeys.join(", ")}.`,
			"BNS-DB-003",
			`Use only supported options: ${allowedKeys.join(", ")}.`,
			{ invalidKeys, allowedKeys },
		);
	}
}

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. There is no BullMQ integration in v1 (it was removed with v0.7), so nothing throws it.
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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; a missing `RabbitMQModule` fails at startup as an unresolved dependency. */
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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; reconnection failures are logged and retried, not thrown. */
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

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; a topology failure is logged with the broker's own error. */
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

	static invalidCron(expression?: string, tz?: string): ScheduleError {
		return new ScheduleError(
			`Invalid or empty cron expression${expression ? `: "${expression}"` : ""}${tz ? ` (time zone "${tz}")` : ""}.`,
			"BNS-SCHED-001",
			[
				'Provide a valid 5-field cron expression to @Cron(), and an IANA time zone such as "America/Sao_Paulo" in `tz`.',
				'Examples: @Cron("0 * * * *")  // every hour',
				'         @Cron("*/5 * * * *") // every 5 minutes',
				"Use https://crontab.guru to generate and validate cron expressions.",
			].join("\n  "),
			expression ? { expression, tz } : undefined,
		);
	}

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it. */
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. The testing module reports a missing provider with `DependencyResolutionError`, so nothing throws it.
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. Its factories describe a Redis rate-limit storage that v1 does not ship, so nothing throws it.
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. There is no S3 upload adapter in v1 (it was removed with v0.7), so nothing throws it. `@FormData()` rejects bad input with `BadRequestException`.
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. There is no email module in v1 (it was removed with v0.7), so nothing throws it.
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. `@Body()`, `@Query()`, `@Param()` and `@FormData()` reject bad input with `BadRequestException`, so nothing throws it. Its codes also collide with the `BNS-HTTP-001`/`BNS-HTTP-002` codes of `ConfigurationError`.
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
				"Make sure nothing reads the request body before Bunstone does.",
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

export class ResponseValidationError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-HTTP-003" = "BNS-HTTP-003",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static mismatch(route: string, cause: Error): ResponseValidationError {
		return new ResponseValidationError(
			`The response of ${route} does not match its @Returns schema.`,
			"BNS-HTTP-003",
			[
				"The handler returned a value the schema rejects; the client received a 500.",
				"Fix the handler or the schema. The Zod issues are in `cause`.",
			].join("\n  "),
			{ route },
			cause,
		);
	}
}

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. A guard that cannot be resolved fails with `DependencyResolutionError`, so nothing throws it.
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

/**
 * @deprecated Unused since v1.0; will be removed in v2.0. v1 has no pluggable HTTP adapters (it runs on `Bun.serve` only), so nothing throws it.
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

export class ImportError extends BunstoneError {
	constructor(
		message: string,
		code: "BNS-IMP-001" | "BNS-IMP-002" | "BNS-IMP-003" = "BNS-IMP-002",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	static missingDriver(
		pkg: string,
		feature: string,
		cause?: Error,
	): ImportError {
		return new ImportError(
			`\`${feature}\` requires the optional driver '${pkg}', which is not installed.`,
			"BNS-IMP-003",
			[
				`Install it next to Bunstone: bun add ${pkg}`,
				`It is an optional peer dependency — Bunstone loads it only when you register ${feature},`,
				"so a project on another backend never installs it.",
				`If you bundle your app, mark '${pkg}' external or the bundler resolves it for every backend.`,
			].join("\n  "),
			{ package: pkg, feature },
			cause,
		);
	}

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it. */
	static typeOnlyImport(
		name: string,
		pkg: string,
		valueAlternatives: string[],
	): ImportError {
		const altSection =
			valueAlternatives.length > 0
				? [
						"",
						"If you were looking for a runtime value with a similar name, did you mean one of these?",
						...valueAlternatives.map((s) => `  - ${s}`),
					].join("\n  ")
				: "";

		return new ImportError(
			`'${name}' is a type-only export of '${pkg}' — it does not exist at runtime.`,
			"BNS-IMP-001",
			[
				`Replace the import with 'import type':`,
				`  ✗  import { ${name} } from '${pkg}'`,
				`  ✓  import type { ${name} } from '${pkg}'`,
				altSection,
			]
				.filter(Boolean)
				.join("\n  "),
			{ name, package: pkg },
		);
	}

	/** @deprecated Unused since v1.0; will be removed in v2.0: nothing throws it; run `bunstone exports` to list the public API. */
	static unknownExport(
		name: string,
		pkg: string,
		suggestions: string[],
	): ImportError {
		const didYouMean =
			suggestions.length > 0
				? [
						"",
						"Did you mean one of these?",
						...suggestions.map((s) => `  - ${s}`),
					].join("\n  ")
				: "";

		return new ImportError(
			`'${name}' is not exported by '${pkg}'.`,
			"BNS-IMP-002",
			[
				"Check the spelling of the imported name.",
				"Run 'bunstone exports' to see all available exports.",
				didYouMean,
			]
				.filter(Boolean)
				.join("\n  "),
			{ name, package: pkg },
		);
	}
}

export class McpError extends BunstoneError {
	constructor(
		message: string,
		code:
			| "BNS-MCP-001"
			| "BNS-MCP-002"
			| "BNS-MCP-003"
			| "BNS-MCP-004"
			| "BNS-MCP-005" = "BNS-MCP-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	/** A decorator or a module option used in a way that cannot work. */
	static invalidDefinition(message: string, suggestion?: string): McpError {
		return new McpError(message, "BNS-MCP-001", suggestion);
	}

	static duplicate(where: string, what: string, existing: string): McpError {
		return new McpError(
			`${where}: there is already a ${what} (${existing}).`,
			"BNS-MCP-002",
			"Give one of them a different `name` (or `uri`) in its decorator.",
			{ where, existing },
		);
	}

	static scopesWithoutAuth(where: string): McpError {
		return new McpError(
			`${where} declares \`scopes\`, which are only checked against a verified access token.`,
			"BNS-MCP-003",
			"Configure the McpModule `auth` option, or set `path: false` if the application only serves stdio.",
			{ where },
		);
	}

	static invalidSchema(where: string, reason: string): McpError {
		return new McpError(
			`${where}: ${reason}`,
			"BNS-MCP-004",
			"Pass a Zod 4.2+ schema such as `z.object({ ... })`, or a JSON Schema wrapped with `fromJsonSchema()` from @modelcontextprotocol/server.",
			{ where },
		);
	}

	static notStarted(feature: string): McpError {
		return new McpError(
			`${feature} is not ready: the MCP server has not been started.`,
			"BNS-MCP-005",
			"Resolve it from an application built with `Application.create()` or `Test.createTestingModule().compile()`, which start it, and import `McpModule.register(...)` in the root module.",
			{ feature },
		);
	}
}
