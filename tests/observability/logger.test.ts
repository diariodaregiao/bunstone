import "reflect-metadata";
import { afterEach, describe, expect, it } from "bun:test";
import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
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

describe("Logger trace correlation", () => {
	afterEach(() => {
		trace.disable();
		context.disable();
	});

	it("omits trace ids when no span is active", () => {
		const logger = new Logger("Test", { pretty: false });
		const lines = captureLog(() => logger.info("hello"));
		expect(JSON.parse(lines[0] ?? "{}").trace_id).toBeUndefined();
	});

	it("includes trace and span ids when inside an active span", () => {
		context.setGlobalContextManager(
			new AsyncLocalStorageContextManager().enable(),
		);
		const provider = new BasicTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())],
		});
		trace.setGlobalTracerProvider(provider);
		const logger = new Logger("Test", { pretty: false });

		const lines = trace.getTracer("test").startActiveSpan("op", (span) => {
			const captured = captureLog(() => logger.info("hello"));
			span.end();
			return captured;
		});

		const record = JSON.parse(lines[0] ?? "{}");
		expect(record.trace_id).toBeString();
		expect(record.span_id).toBeString();
	});
});
