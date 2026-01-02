import { beforeEach, describe, expect, mock, test } from "bun:test";
import { DBAdapter } from "../lib/adapters/db-adapter";

const mockExecute = mock(async () => [[]]);
const mockEnd = mock(async () => {});
const mockCreateConnection = mock(async () => ({
  execute: mockExecute,
  end: mockEnd,
}));

mock.module("mysql2/promise", () => ({
  default: {
    createConnection: mockCreateConnection,
  },
}));

describe("DBAdapter", () => {
  const config = {
    host: "localhost",
    port: 3306,
    username: "root",
    password: "password",
    database: "test_db",
  };

  let adapter: DBAdapter;

  beforeEach(() => {
    adapter = new DBAdapter(config);
    mockCreateConnection.mockClear();
    mockExecute.mockClear();
    mockEnd.mockClear();

    mockCreateConnection.mockResolvedValue({
      execute: mockExecute,
      end: mockEnd,
    } as any);
    mockExecute.mockResolvedValue([[]] as any);
  });

  test("should connect to the database", async () => {
    await adapter.connect();
    expect(mockCreateConnection).toHaveBeenCalledWith(config);
  });

  test("should execute a query", async () => {
    const mockRows = [{ id: 1, name: "Test" }];
    mockExecute.mockResolvedValue([mockRows] as any);

    await adapter.connect();
    const result = await adapter.query("SELECT * FROM users");

    expect(result).toEqual(mockRows);
    expect(mockExecute).toHaveBeenCalledWith("SELECT * FROM users", []);
  });

  test("should disconnect from the database", async () => {
    await adapter.connect();
    await adapter.disconnect();
    expect(mockEnd).toHaveBeenCalled();
  });

  test("should throw error if connection fails", async () => {
    mockCreateConnection.mockRejectedValueOnce(new Error("Connection failed"));

    try {
      await adapter.connect();
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toBe("Connection failed");
    }
  });

  test("should throw error if query fails", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Query failed"));

    await adapter.connect();
    try {
      await adapter.query("INVALID SQL");
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toBe("Query failed");
    }
  });
});
