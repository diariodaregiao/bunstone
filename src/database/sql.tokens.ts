import type { SQL } from "bun";
import { InjectionToken } from "@/core/injectable";

/** Bun.SQL settings passed through as they are. */
type PassthroughOptions = Pick<
	SQL.PostgresOrMySQLOptions,
	"tls" | "prepare" | "bigint" | "transform"
>;

export interface SqlConnectionOptions extends PassthroughOptions {
	adapter?: "postgres" | "mysql" | "mariadb" | "sqlite";
	hostname?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	filename?: string;
	timezone?: string;
	/** Maximum connections in the pool. */
	max?: number;
	/** Seconds a pooled connection may sit idle before it is closed. */
	idleTimeout?: number;
	/** Maximum lifetime of a pooled connection, in seconds. */
	maxLifetime?: number;
	/** Seconds allowed for the whole connection handshake. */
	connectionTimeout?: number;
}

export type SqlModuleInput = string | SqlConnectionOptions;

export const SQL_CLIENT = new InjectionToken<SQL>("SqlClient");
