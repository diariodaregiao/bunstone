import type { SQL } from "bun";
import { InjectionToken } from "@/core/injectable";

export interface SqlConnectionOptions {
	adapter?: "postgres" | "mysql" | "mariadb" | "sqlite";
	hostname?: string;
	port?: number;
	username?: string;
	password?: string;
	database?: string;
	filename?: string;
	timezone?: string;
	max?: number;
	idleTimeout?: number;
	maxLifetime?: number;
	connectionTimeout?: number;
}

export type SqlModuleInput = string | SqlConnectionOptions;

export const SQL_CLIENT = new InjectionToken<SQL>("SqlClient");
