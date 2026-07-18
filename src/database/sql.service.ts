import type { SQL } from "bun";
import { Inject, Injectable } from "@/core/injectable";
import type { OnModuleDestroy } from "@/core/lifecycle";
import { SQL_CLIENT } from "./sql.tokens";

type Row = Record<string, unknown>;
export type TransactionClient = Parameters<
	SQL.TransactionContextCallback<unknown>
>[0];

@Injectable()
export class SqlService implements OnModuleDestroy {
	constructor(@Inject(SQL_CLIENT) private readonly sql: SQL) {}

	get client(): SQL {
		return this.sql;
	}

	async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
		return (await this.sql.unsafe<T[]>(text, params)) as T[];
	}

	async queryOne<T = Row>(
		text: string,
		params: unknown[] = [],
	): Promise<T | null> {
		const rows = await this.query<T>(text, params);
		return rows[0] ?? null;
	}

	transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
		return this.sql.begin(fn) as Promise<T>;
	}

	async onModuleDestroy(): Promise<void> {
		await this.sql.close();
	}
}
