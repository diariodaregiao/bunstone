import { SQL } from "bun";

/**
 * A wrapper class for database operations using Bun's SQL module.
 */
export class DbWrapper {
  private _mysql: SQL;

  constructor(connectionString: string) {
    this._mysql = new SQL(connectionString);
  }

  async query<T = any>(queryString: string): Promise<T[]> {
    return await this._mysql`${queryString}`;
  }

  async transaction(queries: ((trx: SQL) => Promise<void>)[]): Promise<void> {
    await this._mysql.transaction(async (trx) => {
      for (const query of queries) {
        await query(trx);
      }
    });
  }
}
