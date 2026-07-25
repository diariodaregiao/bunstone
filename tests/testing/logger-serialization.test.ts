import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Logger } from "@/utils/logger";

function captureLog(fn: () => void): string[] {
	const lines: string[] = [];
	const original = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	try {
		fn();
	} finally {
		console.log = original;
	}
	return lines;
}

describe("Logger structured serialization", () => {
	it("keeps name, message, stack and cause of an Error", () => {
		const logger = new Logger("Test", { pretty: false });
		const error = new Error("boom", { cause: new Error("root") });

		const lines = captureLog(() => logger.error("failed", error));
		const message = JSON.parse(lines[0] ?? "{}").message as string;

		expect(message).toContain("failed");
		expect(message).toContain("boom");
		expect(message).toContain("Error");
		expect(message).toContain("root");
		expect(message).toContain("stack");
	});

	it("does not throw on a cyclic object", () => {
		const logger = new Logger("Test", { pretty: false });
		const cyclic: Record<string, unknown> = { name: "a" };
		cyclic.self = cyclic;

		const lines = captureLog(() => logger.info("state", cyclic));
		const message = JSON.parse(lines[0] ?? "{}").message as string;

		expect(message).toContain("state");
		expect(message).toContain("[Circular]");
	});

	it("serializes a nested Error inside a plain object", () => {
		const logger = new Logger("Test", { pretty: false });

		const lines = captureLog(() =>
			logger.warn({ job: "sync", error: new Error("nested") }),
		);
		const message = JSON.parse(lines[0] ?? "{}").message as string;

		expect(message).toContain("nested");
	});

	it("defaults pretty to whether stdout is a TTY", () => {
		const logger = new Logger("Test");
		const lines = captureLog(() => logger.info("hello"));

		if (process.stdout.isTTY) {
			expect(lines[0]).toContain("[");
		} else {
			expect(() => JSON.parse(lines[0] ?? "")).not.toThrow();
			expect(lines[0]).not.toContain("[");
		}
	});
});
