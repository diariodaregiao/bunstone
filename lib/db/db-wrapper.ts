import { SQL } from "bun";

/**
 * Creates a new database wrapper instance.
 * @param connectionString - The database connection string, in the format:
 * 
 * @example
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
   * @param queryString The SQL query string to be executed.
   * @example
   *  const users = await db.query("SELECT * FROM users");
   * @returns Array with the query results.
   */
  async query<T = any>(queryString: string): Promise<T[]> {
    const res = (await this._mysql.unsafe<T>(queryString)) as T[];
    return res;
  }

  /**
   * 
   * @param callback Function that receives a array of queries to be executed in a transaction
   * 
   * @example
   *   await this.db.transaction(async (trx) => {
          await trx.unsafe("INSERT INTO users VALUES (UUID(), 'Joe', 'Doe', 25 )");
          await trx.unsafe("UPDATE users SET age = age + 1 WHERE name != 'Joe'")
        });
   * @return Promise that resolves when the transaction is complete 
   * 
   */
  async transaction(callback: (trx: SQL) => Promise<void>): Promise<void> {
    await this._mysql.transaction(async (trx) => {
      await callback(trx);
    });
  }
}
