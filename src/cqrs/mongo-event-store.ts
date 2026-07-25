import type { Collection, Db } from "mongodb";
import { Inject, Injectable, InjectionToken } from "@/core/injectable";
import type { OnModuleInit } from "@/core/lifecycle";
import { loadMongoDriver } from "@/database/mongo.driver";
import { MongoService } from "@/database/mongo.service";
import { DatabaseError, EventStoreError } from "@/errors";
import { Logger } from "@/utils/logger";
import type {
	EventInput,
	EventRecord,
	EventStore,
	Snapshot,
} from "./event-store";

export interface MongoEventStoreOptions {
	/** Default `"events"`. */
	eventsCollection?: string;

	/** Default `"snapshots"`. */
	snapshotsCollection?: string;

	/** Overrides `MongoModule`'s database for the event-store collections only. */
	database?: string;

	/** Reject a commit larger than this. Default 15 MiB, under the 16 MiB BSON cap. */
	maxCommitBytes?: number;
}

export const MONGO_EVENT_STORE_OPTIONS =
	new InjectionToken<MongoEventStoreOptions>("MongoEventStoreOptions");

@Injectable()
export class MongoEventStore implements EventStore, OnModuleInit {
	private commits?: Collection<CommitDoc>;
	private snapshots?: Collection<SnapshotDoc>;
	private maxCommitBytes = DEFAULT_MAX_COMMIT_BYTES;
	private sizeOf: (doc: object) => number = jsonSize;

	constructor(
		private readonly mongo: MongoService,
		@Inject(MONGO_EVENT_STORE_OPTIONS)
		private readonly options: MongoEventStoreOptions,
	) {}

	async onModuleInit(): Promise<void> {
		const db = await this.mongo.db<Db>(this.options.database);
		this.commits = db.collection<CommitDoc>(
			this.options.eventsCollection ?? "events",
		);
		this.snapshots = db.collection<SnapshotDoc>(
			this.options.snapshotsCollection ?? "snapshots",
		);
		this.maxCommitBytes =
			this.options.maxCommitBytes ?? DEFAULT_MAX_COMMIT_BYTES;
		this.sizeOf = await resolveSizer();

		// idempotent, the analogue of `CREATE TABLE IF NOT EXISTS`: a matching
		// index is left untouched
		await this.commits.createIndexes([
			{
				key: { streamId: 1, version: 1 },
				name: STREAM_VERSION_INDEX,
				unique: true,
				collation: SIMPLE,
			},
		]);

		await this.warnOnLegacyIndexes(db);
	}

	/**
	 * One document per `append()`, not per event. MongoDB guarantees
	 * single-document write atomicity on every topology; multi-document
	 * transactions need a replica set and are unavailable on a standalone
	 * `mongod`. Batching the commit is what makes a torn append structurally
	 * impossible — an ordered `insertMany` that fails at event 3 of 5 leaves
	 * events 1 and 2 permanently committed, and there is no rollback. Replay
	 * would then produce a state that never legally existed.
	 */
	async append(
		streamId: string,
		events: EventInput[],
		expectedVersion: number,
	): Promise<void> {
		if (events.length === 0) return;
		const commits = this.requireCommits();

		const doc: CommitDoc = {
			streamId,
			version: expectedVersion + 1,
			lastVersion: expectedVersion + events.length,
			events: events.map((event) => ({
				type: event.type,
				payload: event.payload,
			})),
			timestamp: new Date().toISOString(),
			commitId: crypto.randomUUID(),
		};

		const bytes = this.sizeOf(doc);
		if (bytes > this.maxCommitBytes) {
			throw EventStoreError.payloadTooLarge(
				streamId,
				bytes,
				this.maxCommitBytes,
			);
		}

		// Fast-fail only. The unique index is the arbiter: it alone rejects a
		// writer that reserved this version between the read here and the insert
		// below. With one document per commit the indexed `version` is a commit
		// *boundary*, so this head check is also what catches a caller who
		// hand-rolled an expectedVersion interior to a batch.
		const head = await this.currentVersion(streamId);
		if (head !== expectedVersion) {
			throw EventStoreError.versionConflict(streamId, expectedVersion, head);
		}

		try {
			await commits.insertOne(doc);
		} catch (error) {
			if (isRetryableWrite(error)) {
				// retryable writes are unavailable on a standalone `mongod`, so a
				// timed-out insert may or may not have landed; retrying the *same*
				// document lets the duplicate-key branch tell the two apart
				try {
					await commits.insertOne(doc);
					return;
				} catch (retryError) {
					await this.reconcile(streamId, doc, expectedVersion, retryError);
					return;
				}
			}
			await this.reconcile(streamId, doc, expectedVersion, error);
		}
	}

	read(streamId: string): Promise<EventRecord[]> {
		return this.readFrom(streamId, 0);
	}

	async readFrom(
		streamId: string,
		afterVersion: number,
	): Promise<EventRecord[]> {
		const filter =
			afterVersion > 0
				? { streamId, lastVersion: { $gt: afterVersion } }
				: { streamId };

		const commits = await this.requireCommits()
			.find(filter, { collation: SIMPLE })
			// MongoDB stores no order; natural order is never insertion order
			.sort({ version: 1 })
			.toArray();

		return flatten(commits, afterVersion);
	}

	async saveSnapshot<TState>(snapshot: Snapshot<TState>): Promise<void> {
		try {
			await this.requireSnapshots().updateOne(
				{ _id: snapshot.streamId, version: { $lte: snapshot.version } },
				{ $set: { version: snapshot.version, state: snapshot.state } },
				{ upsert: true, collation: SIMPLE },
			);
		} catch (error) {
			// a duplicate key here means a newer snapshot already exists; a stale
			// writer losing the race is the intended outcome, not an error
			if (!isDuplicateKey(error)) throw error;
		}
	}

	async loadSnapshot<TState>(
		streamId: string,
	): Promise<Snapshot<TState> | null> {
		const doc = await this.requireSnapshots().findOne(
			{ _id: streamId },
			{ collation: SIMPLE },
		);
		return doc
			? { streamId: doc._id, version: doc.version, state: doc.state as TState }
			: null;
	}

	private async reconcile(
		streamId: string,
		doc: CommitDoc,
		expectedVersion: number,
		error: unknown,
	): Promise<void> {
		if (!isDuplicateKey(error)) throw error;
		const stored = await this.commitAt(streamId, doc.version);
		if (stored?.commitId === doc.commitId) return; // our own retried write landed
		throw EventStoreError.versionConflict(
			streamId,
			expectedVersion,
			await this.currentVersion(streamId),
		);
	}

	private async currentVersion(streamId: string): Promise<number> {
		const last = await this.requireCommits().findOne(
			{ streamId },
			{
				sort: { version: -1 },
				projection: { lastVersion: 1 },
				collation: SIMPLE,
			},
		);
		return last?.lastVersion ?? 0;
	}

	private commitAt(
		streamId: string,
		version: number,
	): Promise<CommitDoc | null> {
		return this.requireCommits().findOne(
			{ streamId, version },
			{ collation: SIMPLE },
		);
	}

	/** The direct counterpart of `SqlEventStore.warnOnLegacySchema`. */
	private async warnOnLegacyIndexes(db: Db): Promise<void> {
		const name = this.options.eventsCollection ?? "events";
		try {
			const [collection] = await db.listCollections({ name }).toArray();
			const collation = (
				collection as
					| { options?: { collation?: { locale?: string } } }
					| undefined
			)?.options?.collation;
			if (collation && collation.locale !== "simple") {
				logger.warn(
					`\`${name}\` was created with a case-insensitive default collation (locale "${collation.locale}"): any other reader of this collection will merge stream ids that differ only in case. Bunstone pins { locale: "simple" } on its own index and queries. Recreate the collection without a default collation to remove the hazard.`,
				);
			}

			const indexes = await this.requireCommits().listIndexes().toArray();
			const unique = indexes.find(
				(index) => index.name === STREAM_VERSION_INDEX,
			);
			const drifted =
				unique &&
				(unique.unique !== true ||
					(unique.collation && unique.collation.locale !== "simple"));
			if (drifted) {
				logger.warn(
					`\`${name}.${STREAM_VERSION_INDEX}\` exists but is not { unique: true, collation: { locale: "simple" } }. \`createIndex\` never updates an existing index, so optimistic concurrency is NOT enforced here. Fix during a maintenance window with: db.${name}.dropIndex("${STREAM_VERSION_INDEX}") then db.${name}.createIndex({ streamId: 1, version: 1 }, { name: "${STREAM_VERSION_INDEX}", unique: true, collation: { locale: "simple" } })`,
				);
			}
		} catch {
			// advisory only; a restricted user may not be able to list collections
		}
	}

	private requireCommits(): Collection<CommitDoc> {
		if (!this.commits) throw notConnected();
		return this.commits;
	}

	private requireSnapshots(): Collection<SnapshotDoc> {
		if (!this.snapshots) throw notConnected();
		return this.snapshots;
	}
}

const SIMPLE = { locale: "simple" } as const;
const DEFAULT_MAX_COMMIT_BYTES = 15 * 1024 * 1024;
const STREAM_VERSION_INDEX = "stream_version_unique";
const logger = new Logger("EventStore");

/** One document per `append()` call — see the comment on `append`. */
interface CommitDoc {
	streamId: string;
	/** Version of the first event; unique together with `streamId`. */
	version: number;
	/** Version of the last event in this commit. */
	lastVersion: number;
	events: { type: string; payload: unknown }[];
	timestamp: string;
	commitId: string;
}

interface SnapshotDoc {
	_id: string;
	version: number;
	state: unknown;
}

function flatten(
	commits: readonly CommitDoc[],
	afterVersion: number,
): EventRecord[] {
	const records: EventRecord[] = [];
	for (const commit of commits) {
		commit.events.forEach((event, index) => {
			const version = commit.version + index;
			// safety net for a caller that asked from inside a commit
			if (version <= afterVersion) return;
			records.push({
				streamId: commit.streamId,
				version,
				type: event.type,
				payload: event.payload,
				timestamp: commit.timestamp,
			});
		});
	}
	return records;
}

/** 11000 is `DuplicateKey`; a bulk error carries it in `writeErrors` instead. */
function isDuplicateKey(error: unknown): boolean {
	const candidate = error as { code?: unknown; writeErrors?: unknown } | null;
	if (candidate?.code === 11000) return true;
	const raw = candidate?.writeErrors;
	const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
	return list.some((write) => (write as { code?: unknown })?.code === 11000);
}

function isRetryableWrite(error: unknown): boolean {
	const candidate = error as {
		name?: string;
		hasErrorLabel?: (label: string) => boolean;
	} | null;
	return (
		candidate?.hasErrorLabel?.("RetryableWriteError") === true ||
		candidate?.name === "MongoNetworkError" ||
		candidate?.name === "MongoNetworkTimeoutError"
	);
}

function notConnected(): DatabaseError {
	return DatabaseError.notConnected(
		"MongoEventStore",
		"MongoModule.register(...)",
	);
}

function jsonSize(doc: object): number {
	return Buffer.byteLength(JSON.stringify(doc), "utf8");
}

/** BSON sizing is exact; the JSON fallback keeps the guard working without it. */
async function resolveSizer(): Promise<(doc: object) => number> {
	const driver = (await loadMongoDriver()) as {
		BSON?: { calculateObjectSize?: (doc: object) => number };
	};
	const calculate = driver.BSON?.calculateObjectSize;
	return typeof calculate === "function" ? calculate : jsonSize;
}
