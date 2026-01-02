/**
 * Database Adapter Interface
 * @property connect - Method to establish a database connection
 * @property disconnect - Method to close the database connection
 * @property query - Method to execute a database query
 */
export interface IDbAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(queryString: string, params?: any[]): Promise<T[]>;
}
