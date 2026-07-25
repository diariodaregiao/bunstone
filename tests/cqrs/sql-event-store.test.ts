import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type { SQL } from "bun";
import { SqlEventStore } from "@/cqrs/sql-event-store";
import { SqlService } from "@/database/sql.service";
import { EventStoreError } from "@/errors";

class FakeClient {
	readonly statements: string[] = [];
	constructor(
		readonly options: { adapter: string },
		private readonly failInsert?: Error,
	) {}

	unsafe(text: string, _params: unknown[] = []): Promise<unknown[]> {
		this.statements.push(text);
		if (text.startsWith("INSERT INTO events") && this.failInsert) {
			return Promise.reject(this.failInsert);
		}
		if (text.includes("MAX(version)")) return Promise.resolve([{ v: 0 }]);
		return Promise.resolve([]);
	}

	begin(fn: (tx: FakeClient) => Promise<unknown>): Promise<unknown> {
		return fn(this);
	}
}

function storeFor(adapter: string, failInsert?: Error) {
	const client = new FakeClient({ adapter }, failInsert);
	const service = new SqlService(client as unknown as SQL);
	return { client, store: new SqlEventStore(service) };
}

async function runAll(store: SqlEventStore) {
	await store.append("s-1", [{ type: "Deposited", payload: { amount: 1 } }], 0);
	await store.read("s-1");
	await store.saveSnapshot({ streamId: "s-1", version: 1, state: {} });
	await store.loadSnapshot("s-1");
}

describe("SqlEventStore placeholders", () => {
	it("uses numbered placeholders on postgres", async () => {
		const { client, store } = storeFor("postgres");
		await runAll(store);

		const parameterized = client.statements.filter((s) => s.includes("$1"));
		expect(parameterized.length).toBe(client.statements.length);
		expect(client.statements.some((s) => s.includes("?"))).toBe(false);
		expect(client.statements).toContain(
			"INSERT INTO events (stream_id, version, type, payload, created_at) VALUES ($1, $2, $3, $4, $5)",
		);
		expect(client.statements).toContain(
			"INSERT INTO snapshots (stream_id, version, state) VALUES ($1, $2, $3)",
		);
	});

	it("keeps `?` placeholders on mysql and sqlite", async () => {
		for (const adapter of ["mysql", "mariadb", "sqlite"]) {
			const { client, store } = storeFor(adapter);
			await runAll(store);
			expect(client.statements.some((s) => s.includes("$1"))).toBe(false);
			expect(client.statements).toContain(
				"INSERT INTO events (stream_id, version, type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
			);
		}
	});
});

describe("SqlEventStore concurrency", () => {
	it("maps a primary-key violation to EventStoreError", async () => {
		const duplicate = Object.assign(
			new Error("UNIQUE constraint failed: events.stream_id, events.version"),
			{ code: "SQLITE_CONSTRAINT_PRIMARYKEY" },
		);
		const { store } = storeFor("sqlite", duplicate);

		const error = await store
			.append("s-1", [{ type: "Deposited", payload: {} }], 0)
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(EventStoreError);
		expect((error as EventStoreError).message).toMatch(/Concurrency conflict/);
	});

	it("maps a postgres duplicate key error to EventStoreError", async () => {
		const duplicate = Object.assign(
			new Error('duplicate key value violates unique constraint "events_pkey"'),
			{ code: "23505" },
		);
		const { store } = storeFor("postgres", duplicate);

		const error = await store
			.append("s-1", [{ type: "Deposited", payload: {} }], 0)
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(EventStoreError);
	});

	it("rethrows unrelated driver errors untouched", async () => {
		const boom = Object.assign(new Error("connection reset"), {
			code: "ECONNRESET",
		});
		const { store } = storeFor("sqlite", boom);

		const error = await store
			.append("s-1", [{ type: "Deposited", payload: {} }], 0)
			.catch((e: unknown) => e);

		expect(error).toBe(boom);
	});
});
