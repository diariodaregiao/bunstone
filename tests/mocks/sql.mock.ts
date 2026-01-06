import { mock } from "bun:test";

export type MockSQLTag = (query: TemplateStringsArray, ...args: any[]) => Promise<any>;

export const mockSqlTag = mock(() => Promise.resolve([])) as unknown as MockSQLTag;
export const mockTrxTag = mock(() => Promise.resolve([])) as unknown as MockSQLTag;

export const mockBegin = mock(async (callback: (trx: MockSQLTag) => Promise<any>) => {
  await callback(mockTrxTag);
});

export function resetSQLMocks() {
  (mockSqlTag as any).mockClear();
  (mockTrxTag as any).mockClear();
  mockBegin.mockClear();
}
