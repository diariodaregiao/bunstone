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
  query(query: string, params?: any[]) {
    const sql = SqlModule.getSqlInstance();
    if (!sql) {
      throw new Error(
        "SQL instance not initialized. Call SqlModule.register() first."
      );
    }
    return sql.unsafe(query, params);
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
    this.sqlInstance = new SQL({
      url:
        typeof connection === "string"
          ? connection
          : `${connection.provider}://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`,
    });

    return this;
  }

  static getSqlInstance() {
    return this.sqlInstance;
  }
}
