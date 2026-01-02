import mysql from "mysql2/promise";
import type { IDbAdapter } from "../interfaces/db-adapter";
import type { DBConfig } from "../interfaces/db-config";

export class DBAdapter implements IDbAdapter {
  private config: DBConfig;
  private connection!: mysql.Connection;

  constructor(config: DBConfig) {
    this.config = config;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log("Conectado ao MariaDB!");
    } catch (err) {
      console.error("Erro ao conectar ao MariaDB:", err);
      throw err;
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows as T[];
    } catch (err) {
      console.error("Erro na query:", err);
      throw err;
    }
  }

  async disconnect() {
    await this.connection.end();
    console.log("Desconectado do MariaDB!");
  }
}
