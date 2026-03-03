import { describe, expect, test } from "bun:test";
import {
	ApiOperation,
	ApiTags,
	EmailLayout,
	EmailModule,
	EmailService,
	OnModuleDestroy,
	OnModuleInit,
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

	test("should export module lifecycle classes", () => {
		expect(OnModuleInit).toBeDefined();
		expect(OnModuleDestroy).toBeDefined();
	});
});
