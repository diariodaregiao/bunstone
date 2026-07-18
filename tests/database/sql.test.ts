import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { SqlService } from "@/database/sql.service";
import { SqlModule } from "@/database/sql-module";

@Injectable()
class UsersRepository {
	constructor(private readonly sql: SqlService) {}

	async setup() {
		await this.sql.query(
			"CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)",
		);
	}

	create(name: string, age: number) {
		return this.sql.query("INSERT INTO users (name, age) VALUES (?, ?)", [
			name,
			age,
		]);
	}

	findByName(name: string) {
		return this.sql.queryOne<{ id: number; name: string; age: number }>(
			"SELECT * FROM users WHERE name = ?",
			[name],
		);
	}

	count() {
		return this.sql.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM users");
	}
}

@Module({
	imports: [SqlModule.register({ adapter: "sqlite", filename: ":memory:" })],
	providers: [UsersRepository],
})
class AppModule {}

let app: Application;
let repo: UsersRepository;

beforeEach(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	repo = app.resolve(UsersRepository);
	await repo.setup();
});

afterEach(async () => {
	await app.close();
});

describe("SqlService", () => {
	it("runs parameterized queries", async () => {
		await repo.create("ada", 36);
		const user = await repo.findByName("ada");
		expect(user).toEqual({ id: 1, name: "ada", age: 36 });
	});

	it("protects against injection via bound params", async () => {
		await repo.create("ada", 36);
		const user = await repo.findByName("ada'; DROP TABLE users; --");
		expect(user).toBeNull();
		expect((await repo.count())?.c).toBe(1);
	});

	it("queryOne returns null when nothing matches", async () => {
		expect(await repo.findByName("nobody")).toBeNull();
	});

	it("commits a successful transaction", async () => {
		const sql = app.resolve(SqlService);
		await sql.transaction(async (tx) => {
			await tx.unsafe("INSERT INTO users (name, age) VALUES (?, ?)", [
				"linus",
				54,
			]);
		});
		expect((await repo.count())?.c).toBe(1);
	});

	it("rolls back a failing transaction", async () => {
		const sql = app.resolve(SqlService);
		await expect(
			sql.transaction(async (tx) => {
				await tx.unsafe("INSERT INTO users (name, age) VALUES (?, ?)", [
					"bob",
					40,
				]);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect((await repo.count())?.c).toBe(0);
	});

	it("closes the pool on shutdown", async () => {
		const sql = app.resolve(SqlService);
		await app.close();
		await expect(sql.query("SELECT 1")).rejects.toBeDefined();
	});
});
