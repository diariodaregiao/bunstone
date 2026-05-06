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

type ConnectionOptions = {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	provider: "postgresql" | "mysql" | "sqlite";
	/**
	 * Timezone used for date/time interpretation on the database connection.
	 * Defaults to 'UTC' to ensure consistent, offset-free date handling.
	 * Set to 'local' to use the process timezone, or any valid tz identifier.
	 */
	timezone?: string;
};

type Provider = "postgresql" | "mysql" | "sqlite";

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
): Record<string, string | boolean | number> | undefined {
	if (provider === "postgresql") {
		return { TimeZone: timezone };
	}
	if (provider === "mysql") {
		// Normalise to MySQL's expected offset format ('+00:00') or named zone
		const tz = timezone.toLowerCase() === "utc" ? "+00:00" : timezone;
		return { time_zone: tz };
	}
	return undefined;
}

@Injectable()
export class SqlService {
	async query<T = any>(query: string, params?: any[]): Promise<T[]> {
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

	async transaction(
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

	async bulkInsert<T = any>(table: string, values: T[]): Promise<void> {
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
	static register(connection: string, timezone?: string): typeof SqlModule;
	static register(connection: string | ConnectionOptions, timezone?: string) {
		const url =
			typeof connection === "string"
				? connection
				: `${connection.provider}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

		const provider =
			typeof connection === "string"
				? detectProvider(connection)
				: connection.provider;

		SqlModule.provider = provider;

		const tz =
			typeof connection === "string"
				? (timezone ?? "UTC")
				: (connection.timezone ?? "UTC");

		const connectionConfig = buildConnectionConfig(provider, tz);

		SqlModule.sqlInstance = new SQL({
			url,
			...(connectionConfig && { connection: connectionConfig }),
		});

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

/**
 * Strips parameter values from SQL for safe inclusion in telemetry.
 * Keeps the query structure readable without leaking user data.
 */
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
