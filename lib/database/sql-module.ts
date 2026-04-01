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
): Record<string, string | boolean | number> | undefined {
	if (provider === "postgresql") {
		return { TimeZone: "UTC" };
	}
	if (provider === "mysql") {
		return { time_zone: "+00:00" };
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
	static register(connection: string): typeof SqlModule;
	static register(connection: string | ConnectionOptions) {
		const url =
			typeof connection === "string"
				? connection
				: `${connection.provider}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

		const provider =
			typeof connection === "string"
				? detectProvider(connection)
				: connection.provider;

		const connectionConfig = buildConnectionConfig(provider);

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
