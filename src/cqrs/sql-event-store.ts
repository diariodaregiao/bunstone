import { Injectable } from "@/core/injectable";
import type { OnModuleInit } from "@/core/lifecycle";
import { SqlService } from "@/database/sql.service";
import { EventStoreError } from "@/errors";
import { Logger } from "@/utils/logger";
import type {
	EventInput,
	EventRecord,
	EventStore,
	Snapshot,
} from "./event-store";

interface EventRow {
	stream_id: string;
	version: number;
	type: string;
	payload: string;
	created_at: string;
}

interface SnapshotRow {
	stream_id: string;
	version: number;
	state: string;
}

function adapterOf(sql: SqlService): string | undefined {
	const client = sql.client as unknown as { options?: { adapter?: string } };
	return client.options?.adapter;
}

/**
 * Every engine reports a lost append differently: Postgres raises SQLSTATE
 * 23505, MySQL `ER_DUP_ENTRY`, SQLite a `SQLITE_CONSTRAINT_*` code — and
 * MariaDB, under snapshot isolation, fails the *read* with "Record has changed
 * since last read" rather than the insert. They all mean the same thing here:
 * another writer got to this version first.
 */
function isConcurrencyConflict(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const code = String((error as { code?: unknown }).code ?? "");
	if (
		code === "23505" ||
		code === "ER_DUP_ENTRY" ||
		code === "ER_CHECKREAD" ||
		code.startsWith("SQLITE_CONSTRAINT")
	) {
		return true;
	}
	return /duplicate (key|entry)|unique constraint|record has changed since last read|deadlock found|could not serialize access/i.test(
		error.message,
	);
}

const logger = new Logger("EventStore");

@Injectable()
export class SqlEventStore implements EventStore, OnModuleInit {
	private readonly numberedPlaceholders: boolean;
	private readonly adapter: string | undefined;

	constructor(private readonly sql: SqlService) {
		this.adapter = adapterOf(sql);
		this.numberedPlaceholders = this.adapter === "postgres";
	}

	// Statements are written with `?`; Bun's postgres driver only binds `$1, $2, ...`.
	private bind(text: string): string {
		if (!this.numberedPlaceholders) return text;
		let index = 0;
		return text.replace(/\?/g, () => `$${++index}`);
	}

	async onModuleInit(): Promise<void> {
		const mysql = this.adapter === "mysql" || this.adapter === "mariadb";
		// MySQL's default collation is case-insensitive, which would merge two
		// stream ids differing only in case into one aggregate; and TEXT caps at
		// 64 KB, which a normal event payload can exceed.
		const key = mysql
			? "VARCHAR(255) COLLATE utf8mb4_bin NOT NULL"
			: "VARCHAR(255) NOT NULL";
		const json = mysql ? "LONGTEXT NOT NULL" : "TEXT NOT NULL";

		await this.sql.query(
			`CREATE TABLE IF NOT EXISTS events (stream_id ${key}, version INTEGER NOT NULL, type VARCHAR(255) NOT NULL, payload ${json}, created_at VARCHAR(64) NOT NULL, PRIMARY KEY (stream_id, version))`,
		);
		await this.sql.query(
			`CREATE TABLE IF NOT EXISTS snapshots (stream_id ${key} PRIMARY KEY, version INTEGER NOT NULL, state ${json})`,
		);
		if (mysql) await this.warnOnLegacySchema();
	}

	/**
	 * `CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists,
	 * so a deployment created before the collation fix silently keeps merging
	 * stream ids that differ only in case, and still truncates large payloads.
	 */
	private async warnOnLegacySchema(): Promise<void> {
		try {
			const columns = await this.sql.query<{
				TABLE_NAME: string;
				COLUMN_NAME: string;
				COLLATION_NAME: string | null;
				DATA_TYPE: string;
			}>(
				"SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('events','snapshots') AND COLUMN_NAME IN ('stream_id','payload','state')",
			);

			for (const table of ["events", "snapshots"] as const) {
				const of = (name: string) =>
					columns.find((c) => c.TABLE_NAME === table && c.COLUMN_NAME === name);
				const streamId = of("stream_id");
				const json = of(table === "events" ? "payload" : "state");

				if (streamId && !streamId.COLLATION_NAME?.endsWith("_bin")) {
					logger.warn(
						`\`${table}.stream_id\` uses a case-insensitive collation: two stream ids differing only in case will be treated as one aggregate. Fix with: ALTER TABLE ${table} MODIFY stream_id VARCHAR(255) COLLATE utf8mb4_bin NOT NULL;`,
					);
				}
				if (json && json.DATA_TYPE.toLowerCase() === "text") {
					logger.warn(
						`\`${table}.${json.COLUMN_NAME}\` is TEXT and caps at 64KB. Fix with: ALTER TABLE ${table} MODIFY ${json.COLUMN_NAME} LONGTEXT NOT NULL;`,
					);
				}
			}
		} catch {
			// information_schema is not reachable everywhere; the check is advisory
		}
	}

	async append(
		streamId: string,
		events: EventInput[],
		expectedVersion: number,
	): Promise<void> {
		if (events.length === 0) return;

		try {
			await this.sql.transaction(async (tx) => {
				const rows = (await tx.unsafe(
					this.bind(
						"SELECT COALESCE(MAX(version), 0) AS v FROM events WHERE stream_id = ?",
					),
					[streamId],
				)) as Array<{ v: number }>;
				const current = Number(rows[0]?.v ?? 0);

				if (current !== expectedVersion) {
					throw EventStoreError.versionConflict(
						streamId,
						expectedVersion,
						current,
					);
				}

				const now = new Date().toISOString();
				let version = current;
				for (const event of events) {
					version++;
					await tx.unsafe(
						this.bind(
							"INSERT INTO events (stream_id, version, type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
						),
						[streamId, version, event.type, JSON.stringify(event.payload), now],
					);
				}
			});
		} catch (error) {
			if (error instanceof EventStoreError) throw error;
			// The read-then-insert is not atomic: a concurrent writer is rejected by
			// the (stream_id, version) primary key rather than by the check above.
			if (!isConcurrencyConflict(error)) throw error;
			throw EventStoreError.versionConflict(
				streamId,
				expectedVersion,
				await this.currentVersion(streamId),
			);
		}
	}

	private async currentVersion(streamId: string): Promise<number> {
		const rows = await this.sql.query<{ v: number }>(
			this.bind(
				"SELECT COALESCE(MAX(version), 0) AS v FROM events WHERE stream_id = ?",
			),
			[streamId],
		);
		return Number(rows[0]?.v ?? 0);
	}

	read(streamId: string): Promise<EventRecord[]> {
		return this.readFrom(streamId, 0);
	}

	async readFrom(
		streamId: string,
		afterVersion: number,
	): Promise<EventRecord[]> {
		const rows = await this.sql.query<EventRow>(
			this.bind(
				"SELECT stream_id, version, type, payload, created_at FROM events WHERE stream_id = ? AND version > ? ORDER BY version ASC",
			),
			[streamId, afterVersion],
		);
		return rows.map((row) => ({
			streamId: row.stream_id,
			version: Number(row.version),
			type: row.type,
			payload: JSON.parse(row.payload),
			timestamp: row.created_at,
		}));
	}

	/**
	 * A single upsert, not DELETE-then-INSERT in a transaction: the delete takes
	 * next-key locks that reach beyond the row and deadlocked concurrent writers
	 * on *different* streams. The version predicate makes it monotonic, so a
	 * stale writer can never overwrite a newer snapshot.
	 */
	async saveSnapshot<TState>(snapshot: Snapshot<TState>): Promise<void> {
		const state = JSON.stringify(snapshot.state);
		await this.sql.query(this.bind(this.upsertSnapshot()), [
			snapshot.streamId,
			snapshot.version,
			state,
		]);
	}

	private upsertSnapshot(): string {
		const insert =
			"INSERT INTO snapshots (stream_id, version, state) VALUES (?, ?, ?)";
		if (this.adapter === "mysql" || this.adapter === "mariadb") {
			return `${insert} ON DUPLICATE KEY UPDATE version = IF(VALUES(version) >= version, VALUES(version), version), state = IF(VALUES(version) >= version, VALUES(state), state)`;
		}
		// postgres and sqlite share the standard conflict clause
		return `${insert} ON CONFLICT (stream_id) DO UPDATE SET version = EXCLUDED.version, state = EXCLUDED.state WHERE snapshots.version <= EXCLUDED.version`;
	}

	async loadSnapshot<TState>(
		streamId: string,
	): Promise<Snapshot<TState> | null> {
		const rows = await this.sql.query<SnapshotRow>(
			this.bind(
				"SELECT stream_id, version, state FROM snapshots WHERE stream_id = ?",
			),
			[streamId],
		);
		const row = rows[0];
		if (!row) return null;
		return {
			streamId: row.stream_id,
			version: Number(row.version),
			state: JSON.parse(row.state) as TState,
		};
	}
}
