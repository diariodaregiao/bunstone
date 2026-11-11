import { ConfigurationError } from "@/errors";

/**
 * Bunstone's decorators are TypeScript's legacy ("experimental") decorators,
 * which receive `(target, key?, descriptor?)`. Bun picks the decorator mode
 * for the whole process from the tsconfig.json of the directory it was
 * started in, not the file's own; started anywhere else — a Docker WORKDIR, a
 * monorepo root — it compiles them as standard (TC39) decorators instead,
 * which receive `(value, context)` and drop parameter decorators silently.
 * Without this check that shows up much later as routes answering 404 and a
 * dependency-injection error that blames the wrong thing.
 */
export function assertLegacyDecorator(
	args: unknown[],
	decorator: string,
): void {
	const context = args[1];
	if (
		args.length === 2 &&
		typeof context === "object" &&
		context !== null &&
		"kind" in context
	) {
		throw ConfigurationError.standardDecorators(decorator);
	}
}
