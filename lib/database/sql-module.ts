import { SQL } from "bun";
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
			throw new Error(
				"SQL instance not initialized. Call SqlModule.register() first.",
			);
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
		SqlModule.sqlInstance = new SQL({
			url:
				typeof connection === "string"
					? connection
					: `${connection.provider}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`,
		});

		return SqlModule;
	}

	static getSqlInstance() {
		return SqlModule.sqlInstance;
	}
}
