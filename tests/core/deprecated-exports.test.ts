/**
 * The error classes and factories below are deprecated: nothing in v1 throws
 * them. They stay exported until v2.0 so that code importing them keeps
 * working; this test fails if a cleanup removes one early.
 */
import { describe, expect, it } from "bun:test";
import * as bunstone from "../../index";

const deprecatedClasses = [
	["AdapterError", "BNS-ADP-001"],
	["BullMQError", "BNS-MQ-001"],
	["EmailError", "BNS-EMAIL-001"],
	["GuardError", "BNS-GRD-001"],
	["HttpParamError", "BNS-HTTP-001"],
	["RateLimitError", "BNS-RL-001"],
	["TestingError", "BNS-TEST-001"],
	["UploadError", "BNS-S3-001"],
] as const;

const deprecatedFactories: Array<[string, () => bunstone.BunstoneError]> = [
	["BullMQError.notConfigured", () => bunstone.BullMQError.notConfigured()],
	["BullMQError.queueFailed", () => bunstone.BullMQError.queueFailed("q")],
	["EmailError.notConfigured", () => bunstone.EmailError.notConfigured()],
	["EmailError.sendFailed", () => bunstone.EmailError.sendFailed("a@b.c")],
	["UploadError.emptyPath", () => bunstone.UploadError.emptyPath()],
	["UploadError.uploadFailed", () => bunstone.UploadError.uploadFailed("p")],
	[
		"HttpParamError.formDataUnavailable",
		() => bunstone.HttpParamError.formDataUnavailable(),
	],
	[
		"HttpParamError.formDataReadFailed",
		() => bunstone.HttpParamError.formDataReadFailed("r"),
	],
	[
		"RateLimitError.transactionFailed",
		() => bunstone.RateLimitError.transactionFailed(),
	],
	[
		"RateLimitError.invalidResponse",
		() => bunstone.RateLimitError.invalidResponse(),
	],
	[
		"TestingError.providerNotFound",
		() => bunstone.TestingError.providerNotFound("P"),
	],
	[
		"ModuleInitializationError.providersFailed",
		() => bunstone.ModuleInitializationError.providersFailed(),
	],
	[
		"ModuleInitializationError.unsupportedHttpMethod",
		() => bunstone.ModuleInitializationError.unsupportedHttpMethod("TRACE"),
	],
	["CqrsError.noEventHandler", () => bunstone.CqrsError.noEventHandler("E")],
	[
		"DatabaseError.notInitialized",
		() => bunstone.DatabaseError.notInitialized(),
	],
	[
		"DatabaseError.invalidConfig",
		() => bunstone.DatabaseError.invalidConfig(["x"], ["y"]),
	],
	["RabbitMQError.notConfigured", () => bunstone.RabbitMQError.notConfigured()],
	[
		"RabbitMQError.connectionFailed",
		() => bunstone.RabbitMQError.connectionFailed(3),
	],
	[
		"RabbitMQError.topologyFailed",
		() => bunstone.RabbitMQError.topologyFailed("queue", "q"),
	],
	["ScheduleError.invalidDelay", () => bunstone.ScheduleError.invalidDelay(-1)],
	[
		"ImportError.typeOnlyImport",
		() => bunstone.ImportError.typeOnlyImport("X", "pkg", []),
	],
	[
		"ImportError.unknownExport",
		() => bunstone.ImportError.unknownExport("X", "pkg", []),
	],
];

describe("deprecated exports (kept until v2.0)", () => {
	it.each(deprecatedClasses)(
		"%s is still exported and constructible",
		(name, code) => {
			const ErrorClass = bunstone[name];
			const error = new ErrorClass("boom");
			expect(error).toBeInstanceOf(bunstone.BunstoneError);
			expect(error).toBeInstanceOf(ErrorClass);
			expect(error.code).toBe(code);
			expect(error.summary).toBe("boom");
		},
	);

	it.each(deprecatedFactories)("%s still builds its error", (_, build) => {
		const error = build();
		expect(error).toBeInstanceOf(bunstone.BunstoneError);
		expect(error.code).toMatch(/^BNS-[A-Z0-9]+-\d{3}$/);
	});
});
