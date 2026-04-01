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
		return await sql.unsafe(query, params);
	}

	async transaction(
		queries: Array<{ query: string; params?: any[] }>,
	): Promise<void> {
		const sql = this.getSqlInstance();
		await sql.begin(async (trx) => {
			for (const { query, params } of queries) {
				await trx.unsafe(query, params);
			}
		});
	}

	async bulkInsert<T = any>(table: string, values: T[]): Promise<void> {
		const sql = this.getSqlInstance();
		await sql`INSERT INTO ${sql(table)} ${sql(values)}`;
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
}
