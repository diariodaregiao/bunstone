import { beforeEach, describe, expect, test } from "bun:test";
import { mockBegin, mockSqlTag, mockTrxTag, resetSQLMocks, type MockSQLTag } from "./mocks/sql.mock";

type DbWrapperLike = {
  query: <T = any>(builder: (db: MockSQLTag) => Promise<T>) => Promise<T[]>;
  transaction: (callback: (trx: MockSQLTag) => Promise<any>) => Promise<any>;
};

function createTestableDbWrapper(): DbWrapperLike {
  return {
    query: async <T = any>(builder: (db: MockSQLTag) => Promise<T>): Promise<T[]> => {
      const result = await builder(mockSqlTag);
      return result as T[];
    },
    transaction: async (callback: (trx: MockSQLTag) => Promise<any>): Promise<any> => {
      await mockBegin(async (trx) => {
        await callback(trx);
      });
    },
  };
}

describe("DbWrapper", () => {
  beforeEach(() => {
    resetSQLMocks();
  });

  test("query: should return result from builder", async () => {
    const db = createTestableDbWrapper();
    const mockData = [{ id: 1, name: "Mocked User" }];

    const builder = async (_sql: MockSQLTag) => mockData;

    const result = await db.query(builder);

    expect(result).toEqual(mockData as any[]);
  });

  test("query: should pass SQL tag to builder", async () => {
    const db = createTestableDbWrapper();
    const mockData = [{ id: 1, name: "Mocked User" }];
    (mockSqlTag as any).mockResolvedValue(mockData as any);

    const builder = async (sql: MockSQLTag) => {
      return (await sql`SELECT * FROM users`) as any;
    };

    const result = await db.query(builder);

    expect(result).toEqual(mockData);
    expect(mockSqlTag).toHaveBeenCalledTimes(1);
    expect((mockSqlTag as any).mock.calls[0][0][0]).toBe("SELECT * FROM users");
  });

  test("transaction: should execute callback inside begin", async () => {
    const db = createTestableDbWrapper();
    const transactionCallback = async (trx: MockSQLTag) => {
      await trx`INSERT INTO test VALUES (${1})`;
    };

    await db.transaction(transactionCallback);

    expect(mockBegin).toHaveBeenCalled();
    expect(mockTrxTag).toHaveBeenCalledTimes(1);
    expect((mockTrxTag as any).mock.calls[0][0][0]).toBe("INSERT INTO test VALUES (");
    expect((mockTrxTag as any).mock.calls[0][0][1]).toBe(")");
    expect((mockTrxTag as any).mock.calls[0][1]).toBe(1);
  });

  test("query: should propagate errors", async () => {
    const db = createTestableDbWrapper();
    const error = new Error("Mocked Query Failure");

    const builder = async (_sql: MockSQLTag) => {
      throw error;
    };

    await expect(db.query(builder)).rejects.toThrow("Mocked Query Failure");
  });

  test("transaction: should propagate callback errors", async () => {
    const db = createTestableDbWrapper();

    await expect(
      db.transaction(async (_trx) => {
        throw new Error("Mocked Transaction Failure");
      }),
    ).rejects.toThrow("Mocked Transaction Failure");
  });
});
