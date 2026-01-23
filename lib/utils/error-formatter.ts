import { BunstoneError } from "../errors";
import { colors } from "./colors";

/**
 * Formats and prints a "Crash Report" for core errors.
 */
export class ErrorFormatter {
	static format(error: any): void {
		const line = "━".repeat(60);
		console.error(`\n${colors.red}${line}${colors.reset}`);
		console.error(
			`${colors.red}${colors.bold} 💥 Bunstone Crash Report ${colors.reset}`,
		);
		console.error(`${colors.red}${line}${colors.reset}`);

		if (error instanceof BunstoneError) {
			console.error(
				`\n${colors.yellow}${colors.bold}Error Code:${colors.reset} ${error.code}`,
			);
			console.error(
				`${colors.yellow}${colors.bold}Message   :${colors.reset} ${error.message}`,
			);

			if (error.context) {
				console.error(
					`\n${colors.cyan}${colors.bold}Context   :${colors.reset}`,
				);
				if (typeof error.context === "object") {
					console.error(JSON.stringify(error.context, null, 2));
				} else {
					console.error(error.context);
				}
			}

			if (error.suggestion) {
				console.error(
					`\n${colors.green}${colors.bold}💡 Suggestion:${colors.reset}`,
				);
				console.error(error.suggestion);
			}
		} else {
			console.error(
				`\n${colors.yellow}${colors.bold}Unhandled Error:${colors.reset} ${error.message}`,
			);
			if (error.stack) {
				console.error(`\n${colors.gray}${error.stack}${colors.reset}`);
			}
		}

		console.error(`\n${colors.red}${line}${colors.reset}`);
		console.error(
			`${colors.red} Process exited due to initialization error.${colors.reset}`,
		);
		console.error(`${colors.red}${line}${colors.reset}\n`);
	}
}
