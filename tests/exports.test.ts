import { ApiTags, ApiOperation } from "./index";
import { expect, test, describe } from "bun:test";

describe("Exports", () => {
  test("should export OpenAPI decorators", () => {
    expect(ApiTags).toBeDefined();
    expect(ApiOperation).toBeDefined();
    expect(typeof ApiTags).toBe("function");
  });
});
