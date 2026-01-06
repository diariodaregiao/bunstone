import { SQL } from "bun";

type SQLTag = (query: TemplateStringsArray, ...args: any[]) => Promise<any>;

/**
 * Validates the required environment variables for database connection.
 * @returns config object for database connection
 */
const validateEnvs = () => {
  if (process.env.DATABASE_URL) {
    return;
  }

  const requiredEnvsConfig = [
    "DATABASE_ADAPTER",
    "DATABASE_HOSTNAME",
    "DATABASE_PORT",
    "DATABASE_USERNAME",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
  ];

  for (const env of requiredEnvsConfig) {
    const value = process.env[env];
    if (!value) {
      throw new Error(`Environment variable ${env} is not set.`);
    }
    if (env === "DATABASE_PORT" && isNaN(Number(value))) {
      throw new Error(`Environment variable ${env} must be a valid number.`);
    }
  }

  if (process.env.DATABASE_ADAPTER && !["mysql", "postgres", "sqlite"].includes(process.env.DATABASE_ADAPTER)) {
    throw new Error(`DATABASE_ADAPTER must be "mysql", "postgres" or "sqlite".`);
  }
};

/**
 * Returns the database configuration object after validating environment variables.
 * @returns object containing database configuration
 */
const config = () => {
  validateEnvs();
  return {
    adapter: process.env.DATABASE_ADAPTER! as "mysql" | "postgres" | "sqlite",
    hostname: process.env.DATABASE_HOSTNAME!,
    port: parseInt(process.env.DATABASE_PORT!),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
  };
};

const sql = new SQL(process.env.DATABASE_URL!, { ...config() });

/**
 * dbWrapper is a utility object for interacting with the database using Bun SQL.
 *
 * To work properly, it relies on a database configuration source:
 * 1. **DATABASE_URL** (full connection string) – if provided, it will be used directly.
 * 2. If `DATABASE_URL` is not defined, it uses the individual environment variables:
 *    - DATABASE_ADAPTER (mysql | postgres | sqlite)
 *    - DATABASE_HOSTNAME
 *    - DATABASE_PORT
 *    - DATABASE_USERNAME
 *    - DATABASE_PASSWORD
 *    - DATABASE_NAME
 *
 * The configuration is automatically validated by the internal.
 */

export const dbWrapper = {
  /**
   * Executes a query in the database.
   *
   * @template T The expected result type
   * @param {(db: SQLTag) => Promise<T>} builder Function that receives the SQL instance and returns the query
   * @returns {Promise<T[]>} Query result as an array
   *
   * @example
   * const users = await dbWrapper.query(db => db.query('SELECT * FROM users'));
   */
  query: async <T = any>(builder: (db: SQLTag) => Promise<T>): Promise<T[]> => {
    const result = await builder(sql);
    return result as T[];
  },

  /**
   * Executes a block of code within a transaction.
   * If an error occurs, the transaction will be automatically rolled back.
   *
   * @param {(trx: SQL) => Promise<any>} callback Function that receives the SQL instance of the transaction
   * @returns {Promise<any>} Result of the callback execution
   *
   * @example
   * await dbWrapper.transaction(async (trx) => {
   *   await trx`INSERT INTO users (name) VALUES ('Alice')`;
   *   await trx`INSERT INTO profiles (user_id) VALUES (1)`;
   * });
   */
  transaction: async (callback: (trx: SQLTag) => Promise<any>): Promise<any> => {
    await sql.begin(async (trx) => {
      await callback(trx);
    });
  },
};
