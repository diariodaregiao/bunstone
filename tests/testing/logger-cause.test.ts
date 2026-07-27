import { describe, expect, it } from "bun:test";
import { Logger, LogLevel } from "@/utils/logger";

function capture(run: (logger: Logger) => void): string {
	const original = console.log;
	let output = "";
	console.log = (line: unknown) => {
		output += String(line);
	};
	try {
		run(new Logger("T", { pretty: false, level: LogLevel.DEBUG }));
	} finally {
		console.log = original;
	}
	return output;
}

describe("logger error serialization", () => {
	it("survives a cause chain that loops", () => {
		const outer = new Error("outer");
		const inner = new Error("inner", { cause: outer });
		Object.defineProperty(outer, "cause", { value: inner, configurable: true });

		const output = capture((logger) => logger.error("failed", inner));

		expect(output).toContain("inner");
		expect(output).toContain("[Circular]");
		expect(output).not.toContain("[unserializable]");
	});

	it("keeps a normal cause chain intact", () => {
		const output = capture((logger) =>
			logger.error("failed", new Error("boom", { cause: new Error("root") })),
		);

		expect(output).toContain("boom");
		expect(output).toContain("root");
	});
});
