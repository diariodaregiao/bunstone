/**
 * Database Configuration Interface
 * @property host - Database host address
 * @property port - Database port number
 * @property username - Database username
 * @property password - Database password
 * @property database - Database name
 */
export interface DBConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}
