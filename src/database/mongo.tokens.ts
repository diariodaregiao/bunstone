import { InjectionToken } from "@/core/injectable";

/**
 * The slice of `mongodb`'s `MongoClient` this package uses, declared
 * structurally so the shipped `.d.ts` never names `mongodb`. A SQL-only project
 * has to typecheck without the optional peer installed — even with
 * `skipLibCheck: false`.
 */
export interface MongoClientLike {
	connect(): Promise<unknown>;
	db(name?: string): unknown;
	close(force?: boolean): Promise<void>;
}

export interface MongoConnectionOptions {
	/** Ignored when `client` is supplied. */
	uri?: string;

	/** Defaults to the database in the URI path, else `"bunstone"`. */
	database?: string;

	/**
	 * Either driver options passed verbatim to `new MongoClient(uri, options)`,
	 * or an already-connected client instance that Bunstone will use as-is and
	 * never close.
	 */
	client?: Record<string, unknown> | MongoClientLike;
}

export type MongoModuleInput = string | MongoConnectionOptions;

export const MONGO_OPTIONS = new InjectionToken<MongoConnectionOptions>(
	"MongoOptions",
);

/** A `connect`/`db`/`close` triple means the caller brought their own client. */
export function isClientInstance(value: unknown): value is MongoClientLike {
	const candidate = value as Partial<MongoClientLike> | null;
	return (
		typeof candidate?.connect === "function" &&
		typeof candidate?.db === "function" &&
		typeof candidate?.close === "function"
	);
}
