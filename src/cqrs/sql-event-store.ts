import { Injectable } from "@/core/injectable";
import type { OnModuleInit } from "@/core/lifecycle";
import { SqlService } from "@/database/sql.service";
import { EventStoreError } from "@/errors";
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

// Postgres rejects duplicates with SQLSTATE 23505, MySQL with ER_DUP_ENTRY and
// SQLite with a SQLITE_CONSTRAINT_* code; older drivers only set the message.
function isUniqueViolation(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const code = String((error as { code?: unknown }).code ?? "");
	if (
		code === "23505" ||
		code === "ER_DUP_ENTRY" ||
		code.startsWith("SQLITE_CONSTRAINT")
	) {
		return true;
	}
	return /duplicate (key|entry)|unique constraint/i.test(error.message);
}

@Injectable()
export class SqlEventStore implements EventStore, OnModuleInit {
	private readonly numberedPlaceholders: boolean;

	constructor(private readonly sql: SqlService) {
		this.numberedPlaceholders = adapterOf(sql) === "postgres";
	}

	// Statements are written with `?`; Bun's postgres driver only binds `$1, $2, ...`.
	private bind(text: string): string {
		if (!this.numberedPlaceholders) return text;
		let index = 0;
		return text.replace(/\?/g, () => `$${++index}`);
	}

	async onModuleInit(): Promise<void> {
		await this.sql.query(
			"CREATE TABLE IF NOT EXISTS events (stream_id VARCHAR(255) NOT NULL, version INTEGER NOT NULL, type VARCHAR(255) NOT NULL, payload TEXT NOT NULL, created_at VARCHAR(64) NOT NULL, PRIMARY KEY (stream_id, version))",
		);
		await this.sql.query(
			"CREATE TABLE IF NOT EXISTS snapshots (stream_id VARCHAR(255) NOT NULL PRIMARY KEY, version INTEGER NOT NULL, state TEXT NOT NULL)",
		);
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
			if (!isUniqueViolation(error)) throw error;
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

	async read(streamId: string): Promise<EventRecord[]> {
		const rows = await this.sql.query<EventRow>(
			this.bind(
				"SELECT stream_id, version, type, payload, created_at FROM events WHERE stream_id = ? ORDER BY version ASC",
			),
			[streamId],
		);
		return rows.map((row) => ({
			streamId: row.stream_id,
			version: Number(row.version),
			type: row.type,
			payload: JSON.parse(row.payload),
			timestamp: row.created_at,
		}));
	}

	async saveSnapshot<TState>(snapshot: Snapshot<TState>): Promise<void> {
		await this.sql.transaction(async (tx) => {
			await tx.unsafe(this.bind("DELETE FROM snapshots WHERE stream_id = ?"), [
				snapshot.streamId,
			]);
			await tx.unsafe(
				this.bind(
					"INSERT INTO snapshots (stream_id, version, state) VALUES (?, ?, ?)",
				),
				[snapshot.streamId, snapshot.version, JSON.stringify(snapshot.state)],
			);
		});
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
