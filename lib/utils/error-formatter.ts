import { BunstoneError } from "../errors";
import { colors } from "./colors";

const BORDER = "━".repeat(64);
const THIN = "─".repeat(64);

function label(text: string, color: string): string {
	return `${color}${colors.bold}${text}${colors.reset}`;
}

function indent(text: string, spaces = 4): string {
	return text
		.split("\n")
		.map((l) => " ".repeat(spaces) + l)
		.join("\n");
}

/**
 * Formats and prints a structured "Crash Report" whenever a `BunstoneError`
 * (or any unhandled error) aborts initialisation.
 *
 * Output example:
 * ────────────────────────────────────────────────────────────────
 *  💥  Bunstone — Error Report
 * ────────────────────────────────────────────────────────────────
 *  Code     : BNS-RMQ-001  (RabbitMQError)
 *  Message  : RabbitMQModule is not configured.
 *
 *  Context:
 *    { ... }
 *
 *  💡 How to fix:
 *    Call RabbitMQModule.register({ ... }) in your root AppModule imports.
 *
 *  Caused by:
 *    Error: connect ECONNREFUSED 127.0.0.1:5672
 * ────────────────────────────────────────────────────────────────
 *  ✖  Process terminated due to a Bunstone initialisation error.
 * ────────────────────────────────────────────────────────────────
 */
export class ErrorFormatter {
	/**
	 * Prints a full crash report and (optionally) exits the process.
	 *
	 * @param error    The error to report.
	 * @param exit     When `true` (default), calls `process.exit(1)` after printing.
	 */
	static format(error: unknown, exit = false): void {
		const e = error as any;

		console.error(`\n${colors.red}${BORDER}${colors.reset}`);
		console.error(
			`${colors.red}${colors.bold}  💥  Bunstone — Error Report${colors.reset}`,
		);
		console.error(`${colors.red}${BORDER}${colors.reset}\n`);

		if (e instanceof BunstoneError) {
			// ── Identity ────────────────────────────────────────────────────────
			console.error(
				`  ${label("Code     :", colors.yellow)} ${colors.bold}${e.code}${colors.reset}  ${colors.gray}(${e.name})${colors.reset}`,
			);
			console.error(`  ${label("Message  :", colors.yellow)} ${e.message}`);

			// ── Context ─────────────────────────────────────────────────────────
			if (e.context && Object.keys(e.context).length > 0) {
				console.error(`\n  ${label("Context  :", colors.cyan)}`);
				const json = JSON.stringify(e.context, null, 2);
				console.error(`${colors.gray}${indent(json)}${colors.reset}`);
			}

			// ── Suggestion ──────────────────────────────────────────────────────
			if (e.suggestion) {
				console.error(`\n  ${label("💡 How to fix:", colors.green)}`);
				console.error(`${colors.green}${indent(e.suggestion)}${colors.reset}`);
			}

			// ── Cause chain ─────────────────────────────────────────────────────
			if (e.cause) {
				console.error(`\n  ${label("Caused by :", colors.yellow)}`);
				ErrorFormatter.printCauseChain(e.cause, 1);
			}
		} else {
			// ── Unknown / unhandled error ────────────────────────────────────────
			console.error(
				`  ${label("Type     :", colors.yellow)} ${e?.constructor?.name ?? "Error"}`,
			);
			console.error(
				`  ${label("Message  :", colors.yellow)} ${e?.message ?? String(e)}`,
			);

			if (e?.stack) {
				console.error(`\n  ${label("Stack    :", colors.gray)}`);
				const stackLines = (e.stack as string)
					.split("\n")
					.slice(1) // drop "Error: message" line – already printed
					.slice(0, 10)
					.join("\n");
				console.error(`${colors.gray}${indent(stackLines)}${colors.reset}`);
			}
		}

		console.error(`\n${colors.red}${THIN}${colors.reset}`);
		console.error(
			`${colors.red}${colors.bold}  ✖  Process terminated due to a Bunstone initialisation error.${colors.reset}`,
		);
		console.error(`${colors.red}${BORDER}${colors.reset}\n`);

		if (exit) {
			process.exit(1);
		}
	}

	// ── Private helpers ────────────────────────────────────────────────────────

	private static printCauseChain(cause: unknown, depth: number): void {
		if (!cause || depth > 5) return;

		const e = cause as any;
		const padding = "  ".repeat(depth + 1);

		if (e instanceof BunstoneError) {
			console.error(
				`${padding}${colors.yellow}[${e.code}]${colors.reset} ${e.name}: ${e.message}`,
			);
		} else {
			console.error(
				`${padding}${colors.gray}${e?.constructor?.name ?? "Error"}: ${e?.message ?? String(e)}${colors.reset}`,
			);
		}

		if (e?.cause) {
			ErrorFormatter.printCauseChain(e.cause, depth + 1);
		}
	}
}
