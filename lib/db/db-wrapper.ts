import { SQL } from "bun";

/**
 * Creates a new database wrapper instance.
 * @param connectionString - The database connection string, in the format:
 * "mysql://user:password@host:port/database"
 */
export class DbWrapper {
  private _mysql: SQL;
  private static _instance: DbWrapper | null = null;

  constructor(connectionString: string) {
    this._mysql = new SQL(connectionString);
  }

  static getInstance(connectionString: string): DbWrapper {
    if (!DbWrapper._instance) {
      DbWrapper._instance = new DbWrapper(connectionString);
    }
    return DbWrapper._instance;
  }

  /**
   * Method to execute a query against the database.
   * @param queryString 
   * @returns Array with the query results.
   */
  async query<T = any>(queryString: string): Promise<T[]> {
    const res =  await this._mysql.unsafe<T>(queryString) as T[];
    return res
  }

  async transaction(queries: ((trx: SQL) => Promise<void>)[]): Promise<void> {
    await this._mysql.transaction(async (trx) => {
      for (const query of queries) {
        await query(trx);
      }
    });
  }
}
