import {
  ApiTags,
  ApiOperation,
  EmailModule,
  EmailService,
  EmailLayout,
} from "../index";
import { expect, test, describe } from "bun:test";

describe("Exports", () => {
  test("should export EmailModule and EmailService", () => {
    expect(EmailModule).toBeDefined();
    expect(EmailService).toBeDefined();
    expect(EmailLayout).toBeDefined();
  });

  test("should export OpenAPI decorators", () => {
    expect(ApiTags).toBeDefined();
    expect(ApiOperation).toBeDefined();
    expect(typeof ApiTags).toBe("function");
  });
});
