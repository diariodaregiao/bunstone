import { trace } from "@opentelemetry/api";
import { colors } from "./colors";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	FATAL = 4,
}

export interface LoggerOptions {
	level?: LogLevel;
	timestamp?: boolean;
	pretty?: boolean;
}

/**
 * `JSON.stringify` renders an Error as `{}` — dropping message, stack and cause
 * in the very mode meant for shipping logs — and throws on a cyclic object,
 * which would take down the code path the log was there to diagnose.
 */
function serializeArg(value: unknown): string {
	try {
		if (value instanceof Error) return safeStringify(errorShape(value));
		if (typeof value === "object" && value !== null)
			return safeStringify(value);
		return String(value);
	} catch {
		return "[unserializable]";
	}
}

function errorShape(error: Error): Record<string, unknown> {
	const shape: Record<string, unknown> = {
		name: error.name,
		message: error.message,
		stack: error.stack,
	};
	if (error.cause !== undefined) {
		shape.cause =
			error.cause instanceof Error ? errorShape(error.cause) : error.cause;
	}
	return shape;
}

function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();
	try {
		return (
			JSON.stringify(value, (_key, val) => {
				if (val instanceof Error) return errorShape(val);
				if (typeof val === "bigint") return val.toString();
				if (typeof val === "object" && val !== null) {
					if (seen.has(val)) return "[Circular]";
					seen.add(val);
				}
				return val;
			}) ?? String(value)
		);
	} catch {
		return String(value);
	}
}

export class Logger {
	private level: LogLevel;
	private showTimestamp: boolean;
	private pretty: boolean;

	constructor(
		private name: string,
		options: LoggerOptions = {},
	) {
		this.level = options.level ?? LogLevel.INFO;
		this.showTimestamp = options.timestamp ?? true;
		// ANSI escapes are noise in a piped or containerised log file, so colours
		// are only on when someone is actually looking at a terminal
		this.pretty = options.pretty ?? Boolean(process.stdout?.isTTY);
	}

	private getTimestamp(): string {
		const now = new Date();
		return now.toISOString();
	}

	private traceContext(): { trace_id: string; span_id: string } | undefined {
		const span = trace.getActiveSpan();
		if (!span) return undefined;
		const spanContext = span.spanContext();
		if (!spanContext.traceId) return undefined;
		return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
	}

	private formatMessage(level: string, color: string, ...args: any[]): void {
		const traceContext = this.traceContext();

		if (!this.pretty) {
			console.log(
				JSON.stringify({
					timestamp: this.getTimestamp(),
					level,
					name: this.name,
					message: args.map(serializeArg).join(" "),
					...traceContext,
				}),
			);
			return;
		}

		let message = "";

		if (this.showTimestamp) {
			message += `${colors.gray}${this.getTimestamp()}${colors.reset} `;
		}

		message += `${color}[${level}]${colors.reset} `;
		message += `${colors.cyan}[${this.name}]${colors.reset} `;

		if (traceContext) {
			message += `${colors.gray}[trace:${traceContext.trace_id.slice(0, 8)}]${colors.reset} `;
		}

		console.log(message, ...args);
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level;
	}

	debug(...args: any[]): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			this.formatMessage("DEBUG", colors.blue, ...args);
		}
	}

	info(...args: any[]): void {
		if (this.shouldLog(LogLevel.INFO)) {
			this.formatMessage("INFO", colors.green, ...args);
		}
	}

	log(...args: any[]): void {
		this.info(...args);
	}

	warn(...args: any[]): void {
		if (this.shouldLog(LogLevel.WARN)) {
			this.formatMessage("WARN", colors.yellow, ...args);
		}
	}

	error(...args: any[]): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			this.formatMessage("ERROR", colors.red, ...args);
		}
	}

	fatal(...args: any[]): void {
		if (this.shouldLog(LogLevel.FATAL)) {
			this.formatMessage("FATAL", colors.magenta, ...args);
		}
	}

	child(childName: string): Logger {
		return new Logger(`${this.name}:${childName}`, {
			level: this.level,
			timestamp: this.showTimestamp,
			pretty: this.pretty,
		});
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	group(label: string, callback: () => void): void {
		console.group(`${colors.cyan}${label}${colors.reset}`);
		callback();
		console.groupEnd();
	}

	async time<T>(label: string, callback: () => Promise<T> | T): Promise<T> {
		const start = performance.now();
		this.debug(`⏱️  Starting: ${label}`);

		try {
			const result = await callback();
			const duration = (performance.now() - start).toFixed(2);
			this.debug(`✅ Completed: ${label} (${duration}ms)`);
			return result;
		} catch (error) {
			const duration = (performance.now() - start).toFixed(2);
			this.error(`❌ Failed: ${label} (${duration}ms)`, error);
			throw error;
		}
	}
}
