import { Inject, Injectable } from "@/core/injectable";
import type { OnModuleDestroy, OnModuleInit } from "@/core/lifecycle";
import { loadMongoDriver } from "./mongo.driver";
import {
	isClientInstance,
	MONGO_OPTIONS,
	type MongoClientLike,
	type MongoConnectionOptions,
} from "./mongo.tokens";

const DEFAULT_URI = "mongodb://localhost:27017";
const DEFAULT_DATABASE = "bunstone";

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
	/**
	 * The driver is an optional peer and importing it is async, so the connection
	 * cannot be built by a provider factory the way `SQL_CLIENT` is. It is a
	 * memoised promise instead, and `onModuleInit` exists only to force it early:
	 * `runLifecycle` walks instances in registration order, so a store whose
	 * `onModuleInit` happens to run first must still await the same connection
	 * rather than race an unconnected client.
	 */
	private connection?: Promise<{ client: MongoClientLike; db: unknown }>;
	private owned = true;
	private ready = false;

	constructor(
		@Inject(MONGO_OPTIONS) private readonly options: MongoConnectionOptions,
	) {}

	/** Forces the connection early so a bad URI fails bootstrap, not the first write. */
	async onModuleInit(): Promise<void> {
		await this.connect();
	}

	async client<TClient = unknown>(): Promise<TClient> {
		return (await this.connect()).client as TClient;
	}

	async db<TDb = unknown>(dbName?: string): Promise<TDb> {
		const { client, db } = await this.connect();
		return (dbName ? client.db(dbName) : db) as TDb;
	}

	/** False until the first successful connect; suitable as a readiness check. */
	get connected(): boolean {
		return this.ready;
	}

	async onModuleDestroy(): Promise<void> {
		// a connection that failed to open must not turn shutdown into a second failure
		const established = await this.connection?.catch(() => null);
		this.ready = false;
		if (established && this.owned) await established.client.close();
	}

	private connect(): Promise<{ client: MongoClientLike; db: unknown }> {
		this.connection ??= this.establish().catch((error: unknown) => {
			// let a later call retry rather than caching the failure forever
			this.connection = undefined;
			throw error;
		});
		return this.connection;
	}

	private async establish(): Promise<{
		client: MongoClientLike;
		db: unknown;
	}> {
		const supplied = this.options.client;
		let client: MongoClientLike;

		if (isClientInstance(supplied)) {
			// brought by the caller: connect is their business, and so is closing it
			this.owned = false;
			client = supplied;
		} else {
			const { MongoClient } = await loadMongoDriver();
			const uri = this.options.uri ?? DEFAULT_URI;
			client = new MongoClient(uri, supplied) as unknown as MongoClientLike;
			await client.connect();
		}

		this.ready = true;
		return { client, db: client.db(this.databaseName()) };
	}

	private databaseName(): string {
		if (this.options.database) return this.options.database;
		const fromUri = pathDatabase(this.options.uri);
		return fromUri ?? DEFAULT_DATABASE;
	}
}

/** `mongodb://host:27017/orders` -> `orders`. */
function pathDatabase(uri: string | undefined): string | undefined {
	if (!uri) return undefined;
	const path = uri.split("?", 1)[0]?.split("/")[3];
	return path && path.length > 0 ? path : undefined;
}
