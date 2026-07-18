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

@Injectable()
export class SqlEventStore implements EventStore, OnModuleInit {
	constructor(private readonly sql: SqlService) {}

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

		await this.sql.transaction(async (tx) => {
			const rows = (await tx.unsafe(
				"SELECT COALESCE(MAX(version), 0) AS v FROM events WHERE stream_id = ?",
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
					"INSERT INTO events (stream_id, version, type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
					[streamId, version, event.type, JSON.stringify(event.payload), now],
				);
			}
		});
	}

	async read(streamId: string): Promise<EventRecord[]> {
		const rows = await this.sql.query<EventRow>(
			"SELECT stream_id, version, type, payload, created_at FROM events WHERE stream_id = ? ORDER BY version ASC",
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
			await tx.unsafe("DELETE FROM snapshots WHERE stream_id = ?", [
				snapshot.streamId,
			]);
			await tx.unsafe(
				"INSERT INTO snapshots (stream_id, version, state) VALUES (?, ?, ?)",
				[snapshot.streamId, snapshot.version, JSON.stringify(snapshot.state)],
			);
		});
	}

	async loadSnapshot<TState>(
		streamId: string,
	): Promise<Snapshot<TState> | null> {
		const rows = await this.sql.query<SnapshotRow>(
			"SELECT stream_id, version, state FROM snapshots WHERE stream_id = ?",
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
