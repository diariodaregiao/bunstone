import { beforeEach, describe, expect, test } from "bun:test";
import { mockBegin, mockUnsafe, resetSQLMocks } from "./mocks/sql.mock";

class TestableDbWrapper {
  private _mysql: { unsafe: typeof mockUnsafe; begin: typeof mockBegin };
  private static _instance: TestableDbWrapper | null = null;

  constructor(_connectionString: string) {
    this._mysql = { unsafe: mockUnsafe, begin: mockBegin };
  }

  static getInstance(connectionString: string): TestableDbWrapper {
    if (!TestableDbWrapper._instance) {
      TestableDbWrapper._instance = new TestableDbWrapper(connectionString);
    }
    return TestableDbWrapper._instance;
  }

  static resetInstance(): void {
    TestableDbWrapper._instance = null;
  }

  async query<T = any>(queryString: string): Promise<T[]> {
    //@ts-ignore
    const res = (await this._mysql.unsafe(queryString)) as T[];
    return res;
  }

  async transaction(callback: (trx: any) => Promise<void>): Promise<void> {
    await this._mysql.begin(async (trx: any) => {
      await callback(trx);
    });
  }
}

describe("DbWrapper", () => {
  const connectionString = "mysql://user:pass@localhost:3306/db";

  beforeEach(() => {
    resetSQLMocks();
    TestableDbWrapper.resetInstance();
  });

  test("should create a new instance via constructor without connecting to DB", () => {
    const db = new TestableDbWrapper(connectionString);
    expect(db).toBeInstanceOf(TestableDbWrapper);
  });

  test("should implement singleton pattern via getInstance", () => {
    const instance1 = TestableDbWrapper.getInstance(connectionString);
    const instance2 = TestableDbWrapper.getInstance(connectionString);
    expect(instance1).toBe(instance2);
  });

  test("should execute query using mocked unsafe", async () => {
    const db = new TestableDbWrapper(connectionString);
    const query = "SELECT * FROM users";
    const mockData = [{ id: 1, name: "Mocked User" }];
    mockUnsafe.mockResolvedValue(mockData as any);

    const result = await db.query(query);

    expect(result).toEqual(mockData);
    expect(mockUnsafe).toHaveBeenCalledWith(query);
  });

  test("should execute transaction using mocked begin", async () => {
    const db = new TestableDbWrapper(connectionString);
    const transactionCallback = async (trx: any) => {
      await trx.unsafe("INSERT INTO test VALUES (1)");
    };

    await db.transaction(transactionCallback);

    expect(mockBegin).toHaveBeenCalled();
    expect(mockUnsafe).toHaveBeenCalledWith("INSERT INTO test VALUES (1)");
  });

  test("should handle errors in query without hitting DB", async () => {
    const db = new TestableDbWrapper(connectionString);
    const error = new Error("Mocked Query Failure");
    mockUnsafe.mockRejectedValue(error as any);

    await expect(db.query("SELECT * FROM error")).rejects.toThrow("Mocked Query Failure");
  });
});
