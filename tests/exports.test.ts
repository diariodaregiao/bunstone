import { describe, expect, test } from "bun:test";
import {
	ApiOperation,
	ApiTags,
	EmailLayout,
	EmailModule,
	EmailService,
} from "../index";

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
