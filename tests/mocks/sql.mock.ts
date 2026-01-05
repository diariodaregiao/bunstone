import { mock } from "bun:test";

export const mockUnsafe = mock(() => Promise.resolve([]));
export const mockBegin = mock(async (callback: any) => {
  const trx = { unsafe: mockUnsafe };
  await callback(trx);
});

export function resetSQLMocks() {
  mockUnsafe.mockClear();
  mockBegin.mockClear();
}
