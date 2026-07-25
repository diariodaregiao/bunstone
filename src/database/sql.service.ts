import type { SQL } from "bun";
import { Inject, Injectable } from "@/core/injectable";
import type { OnModuleDestroy } from "@/core/lifecycle";
import { instrumentQuery } from "@/observability/instrumentation";
import { SQL_CLIENT } from "./sql.tokens";

type Row = Record<string, unknown>;

/** The leading verb is enough to group operations without exploding labels. */
function operationOf(text: string): string {
	return text.trimStart().split(/\s+/, 1)[0]?.toUpperCase() ?? "QUERY";
}
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
		return instrumentQuery(
			operationOf(text),
			text,
			async () => (await this.sql.unsafe<T[]>(text, params)) as T[],
		);
	}

	async queryOne<T = Row>(
		text: string,
		params: unknown[] = [],
	): Promise<T | null> {
		const rows = await this.query<T>(text, params);
		return rows[0] ?? null;
	}

	transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
		return instrumentQuery(
			"TRANSACTION",
			"BEGIN",
			() => this.sql.begin(fn) as Promise<T>,
		);
	}

	async onModuleDestroy(): Promise<void> {
		await this.sql.close();
	}
}
