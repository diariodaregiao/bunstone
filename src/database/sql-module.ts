import { SQL } from "bun";
import type { DynamicModule } from "@/core/module";
import { SqlService } from "./sql.service";
import {
	SQL_CLIENT,
	type SqlConnectionOptions,
	type SqlModuleInput,
} from "./sql.tokens";

export function createSqlClient(input: SqlModuleInput): SQL {
	if (typeof input === "string") return new SQL(input);
	const { timezone = "utc", ...rest }: SqlConnectionOptions = input;
	return new SQL({ ...rest, timezone } as SQL.Options);
}

export class SqlModule {
	static register(input: SqlModuleInput): DynamicModule {
		return {
			module: SqlModule,
			global: true,
			providers: [
				{ provide: SQL_CLIENT, useFactory: () => createSqlClient(input) },
				SqlService,
			],
		};
	}
}
