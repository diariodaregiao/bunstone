import {
	context as otelContext,
	metrics as otelMetrics,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
import { SQL } from "bun";
import { DatabaseError } from "../errors";
import { Injectable } from "../injectable";
import { Module } from "../module";

type Provider = "postgresql" | "mysql" | "sqlite";

type BunSqlPoolOptions = Pick<
	SQL.PostgresOrMySQLOptions,
	| "max"
	| "maxLifetime"
	| "connectionTimeout"
	| "idleTimeout"
	| "connection"
	| "tls"
	| "prepare"
	| "bigint"
	| "onconnect"
	| "onclose"
	| "path"
>;

type BunSqliteClientOptions = Pick<
	SQL.SQLiteOptions,
	"readonly" | "create" | "safeIntegers" | "strict"
>;

/** Options forwarded by Bunstone to the underlying Bun.SQL client. */
export type BunSqlClientOptions = Partial<
	BunSqlPoolOptions & BunSqliteClientOptions
>;

/**
 * Options accepted by {@link SqlModule.register}.
 * Only Bunstone-supported settings are allowed.
 */
export type SqlModuleOptions = BunSqlClientOptions & {
	/**
	 * Timezone used for date/time interpretation on the database connection.
	 * Mapped to driver `connection` settings when not provided explicitly.
	 * Defaults to `UTC`.
	 */
	timezone?: string;
};

export type SqlConnectionDetails = {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	provider: Provider;
};

export type ConnectionOptions = SqlConnectionDetails & SqlModuleOptions;

/** @deprecated Use {@link ConnectionOptions} */
export type SqlConnectionOptions = ConnectionOptions;

/** @deprecated Use {@link SqlModuleOptions} */
export type SqlRegisterOptions = SqlModuleOptions;

/** Pool-related subset of {@link SqlModuleOptions}. */
export type SqlPoolOptions = Pick<
	SqlModuleOptions,
	"max" | "maxLifetime" | "connectionTimeout" | "idleTimeout"
>;

type SqlClientInitOptions = Omit<
	SqlModuleOptions,
	"url" | "filename" | "timezone"
>;

const SQL_MODULE_OPTION_KEYS = [
	"timezone",
	"max",
	"maxLifetime",
	"connectionTimeout",
	"idleTimeout",
	"connection",
	"tls",
	"prepare",
	"bigint",
	"onconnect",
	"onclose",
	"path",
	"readonly",
	"create",
	"safeIntegers",
	"strict",
] as const satisfies readonly (keyof SqlModuleOptions)[];

const SQL_CONNECTION_DETAIL_KEYS = [
	"host",
	"port",
	"username",
	"password",
	"database",
	"provider",
] as const satisfies readonly (keyof SqlConnectionDetails)[];

const CONNECTION_CLOSED_CODES = new Set([
	"ERR_MYSQL_CONNECTION_CLOSED",
	"ERR_POSTGRES_CONNECTION_CLOSED",
]);

function assertOnlyAllowedKeys(
	source: Record<string, unknown>,
	allowedKeys: readonly string[],
): void {
	const invalidKeys = Object.keys(source).filter(
		(key) => !allowedKeys.includes(key),
	);

	if (invalidKeys.length > 0) {
		throw DatabaseError.invalidConfig(invalidKeys, allowedKeys);
	}
}

function pickSqlModuleOptions(
	source: Record<string, unknown>,
): SqlModuleOptions {
	assertOnlyAllowedKeys(source, SQL_MODULE_OPTION_KEYS);

	const picked = {} as SqlModuleOptions;
	for (const key of SQL_MODULE_OPTION_KEYS) {
		if (key in source) {
			(picked as Record<string, unknown>)[key] = source[key];
		}
	}
	return picked;
}

function detectProvider(url: string): Provider {
	if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
		return "mysql";
	}
	if (
		url === ":memory:" ||
		url.startsWith("sqlite://") ||
		url.startsWith("sqlite:") ||
		url.startsWith("file://") ||
		url.startsWith("file:")
	) {
		return "sqlite";
	}
	return "postgresql";
}

function buildConnectionConfig(
	provider: Provider,
	timezone: string,
): NonNullable<SQL.PostgresOrMySQLOptions["connection"]> | undefined {
	if (provider === "postgresql") {
		return { TimeZone: timezone };
	}
	if (provider === "mysql") {
		const tz = timezone.toLowerCase() === "utc" ? "+00:00" : timezone;
		return { time_zone: tz };
	}
	return undefined;
}

function normalizeRegisterOptions(
	options?: SqlModuleOptions | string,
): SqlModuleOptions {
	if (typeof options === "string") {
		return { timezone: options };
	}
	if (!options) {
		return {};
	}

	return pickSqlModuleOptions(options as Record<string, unknown>);
}

function buildSqlClientOptions(
	provider: Provider,
	timezone: string,
	options: SqlModuleOptions,
): SqlClientInitOptions {
	const { timezone: _timezone, connection: userConnection, ...rest } = options;
	const driverConnectionConfig = buildConnectionConfig(provider, timezone);
	const connection = {
		...driverConnectionConfig,
		...userConnection,
	};

	return {
		...rest,
		...(Object.keys(connection).length > 0 && { connection }),
	};
}

function resolveConnectionUrl(connection: string | ConnectionOptions): string {
	if (typeof connection === "string") {
		return connection;
	}

	return `${connection.provider}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
}

function resolveProvider(connection: string | ConnectionOptions): Provider {
	return typeof connection === "string"
		? detectProvider(connection)
		: connection.provider;
}

function resolveTimezone(
	connection: string | ConnectionOptions,
	options: SqlModuleOptions,
): string {
	if (options.timezone) {
		return options.timezone;
	}

	if (typeof connection === "object" && connection.timezone) {
		return connection.timezone;
	}

	return "UTC";
}

function resolveRegisterOptions(
	connection: string | ConnectionOptions,
	options?: SqlModuleOptions | string,
): SqlModuleOptions {
	const normalized = normalizeRegisterOptions(options);

	if (typeof connection !== "object") {
		return normalized;
	}

	assertOnlyAllowedKeys(
		connection as Record<string, unknown>,
		[...SQL_CONNECTION_DETAIL_KEYS, ...SQL_MODULE_OPTION_KEYS],
	);

	const {
		host: _host,
		port: _port,
		username: _username,
		password: _password,
		database: _database,
		provider: _provider,
		...connectionSqlOptions
	} = connection;

	return {
		...pickSqlModuleOptions(connectionSqlOptions as Record<string, unknown>),
		...normalized,
	};
}

function isConnectionClosedError(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		CONNECTION_CLOSED_CODES.has(String((err as { code: unknown }).code))
	);
}

async function withConnectionRetry<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		if (!isConnectionClosedError(err)) {
			throw err;
		}
	}

	return await fn();
}

@Injectable()
export class SqlService {
	async query<T = any>(query: string, params?: any[]): Promise<T[]> {
		return withConnectionRetry(() => this.executeQuery<T>(query, params));
	}

	async transaction(
		queries: Array<{ query: string; params?: any[] }>,
	): Promise<void> {
		return withConnectionRetry(() => this.executeTransaction(queries));
	}

	async bulkInsert<T = any>(table: string, values: T[]): Promise<void> {
		return withConnectionRetry(() => this.executeBulkInsert(table, values));
	}

	private async executeQuery<T>(query: string, params?: any[]): Promise<T[]> {
		const sql = this.getSqlInstance();
		const tracer = trace.getTracer("bunstone.db");
		const operation = detectOperation(query);
		const span = tracer.startSpan(`db.${operation}`, {
			attributes: {
				"db.system": SqlModule.getProvider() ?? "postgresql",
				"db.operation.name": operation,
				"db.query.text": sanitizeSql(query),
			},
		});

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					const result = await sql.unsafe(query, params);
					span.setStatus({ code: SpanStatusCode.OK });
					return result as T[];
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					recordDbMetric(operation, performance.now() - start);
				}
			},
		);
	}

	private async executeTransaction(
		queries: Array<{ query: string; params?: any[] }>,
	): Promise<void> {
		const sql = this.getSqlInstance();
		const tracer = trace.getTracer("bunstone.db");
		const span = tracer.startSpan("db.transaction", {
			attributes: {
				"db.system": SqlModule.getProvider() ?? "postgresql",
				"db.operation.name": "transaction",
				"db.transaction.query_count": queries.length,
			},
		});

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					await sql.begin(async (trx) => {
						for (const { query, params } of queries) {
							await trx.unsafe(query, params);
						}
					});
					span.setStatus({ code: SpanStatusCode.OK });
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					recordDbMetric("transaction", performance.now() - start);
				}
			},
		);
	}

	private async executeBulkInsert<T>(
		table: string,
		values: T[],
	): Promise<void> {
		const sql = this.getSqlInstance();
		const tracer = trace.getTracer("bunstone.db");
		const span = tracer.startSpan("db.INSERT", {
			attributes: {
				"db.system": SqlModule.getProvider() ?? "postgresql",
				"db.operation.name": "INSERT",
				"db.sql.table": table,
				"db.bulk_insert.row_count": values.length,
			},
		});

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					await sql`INSERT INTO ${sql(table)} ${sql(values)}`;
					span.setStatus({ code: SpanStatusCode.OK });
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					recordDbMetric("INSERT", performance.now() - start);
				}
			},
		);
	}

	private getSqlInstance(): SQL {
		const sql = SqlModule.getSqlInstance();
		if (!sql) {
			throw DatabaseError.notInitialized();
		}
		return sql;
	}
}

@Module({
	providers: [SqlService],
	global: true,
})
export class SqlModule {
	private static sqlInstance: SQL;
	private static provider: Provider | undefined;

	static register(connection: ConnectionOptions): typeof SqlModule;
	static register(
		connection: string,
		options?: SqlModuleOptions | string,
	): typeof SqlModule;
	static register(
		connection: string | ConnectionOptions,
		options?: SqlModuleOptions | string,
	) {
		const resolvedOptions = resolveRegisterOptions(connection, options);
		const url = resolveConnectionUrl(connection);
		const provider = resolveProvider(connection);
		const timezone = resolveTimezone(connection, resolvedOptions);
		const sqlOptions = buildSqlClientOptions(
			provider,
			timezone,
			resolvedOptions,
		);

		SqlModule.provider = provider;

		SqlModule.sqlInstance = new SQL({
			url,
			...sqlOptions,
		} as SQL.Options);

		return SqlModule;
	}

	static getSqlInstance() {
		return SqlModule.sqlInstance;
	}

	static getProvider(): Provider | undefined {
		return SqlModule.provider;
	}
}

// ── OTel helpers ──────────────────────────────────────────────────────────────

function detectOperation(query: string): string {
	const trimmed = query.trimStart().toUpperCase();
	for (const op of [
		"SELECT",
		"INSERT",
		"UPDATE",
		"DELETE",
		"CREATE",
		"DROP",
		"ALTER",
		"TRUNCATE",
		"BEGIN",
		"COMMIT",
		"ROLLBACK",
	]) {
		if (trimmed.startsWith(op)) return op;
	}
	return "QUERY";
}

function sanitizeSql(query: string): string {
	return query
		.replace(/'[^']*'/g, "'?'")
		.replace(/\d+/g, "?")
		.replace(/\s+/g, " ")
		.trim()
		.substring(0, 1024);
}

function recordDbMetric(operation: string, durationMs: number): void {
	try {
		otelMetrics
			.getMeter("bunstone")
			.createHistogram("db.query.duration", {
				description: "Duration of database queries",
				unit: "ms",
			})
			.record(durationMs, {
				"db.operation.name": operation,
				"db.system": SqlModule.getProvider() ?? "postgresql",
			});
	} catch {
		// best-effort
	}
}
