import { ImportError } from "@/errors";

/**
 * What to throw when importing an optional driver failed: "not installed"
 * becomes an `ImportError` that says how to install it; anything else is
 * returned untouched — wrapping a driver that throws while evaluating would
 * report a broken install as a missing one.
 *
 * Call sites write the `import()` themselves, syntactically inside a
 * `try` block:
 *
 * ```ts
 * try {
 *   return await import("mongodb");
 * } catch (error) {
 *   throw optionalImportError(error, "mongodb", "MongoModule");
 * }
 * ```
 *
 * That shape is what Bun's bundler needs: it bundles the driver when it is
 * installed, and leaves a runtime import when it is not. A bare `import()`
 * anywhere else makes `bun build` fail for every app that skipped the
 * optional dependency.
 */
export function optionalImportError(
	error: unknown,
	pkg: string,
	feature: string,
): unknown {
	if (!isModuleNotFound(error, pkg)) return error;
	return ImportError.missingDriver(pkg, feature, asError(error));
}

/**
 * Only *this* specifier failing to resolve means the driver is absent. A
 * dependency of the driver failing to resolve is a broken install, and telling
 * the user to install a package they already have would send them nowhere.
 */
function isModuleNotFound(error: unknown, pkg: string): boolean {
	const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	// the resolution error code alone is not enough: it is also what a missing
	// *dependency of the driver* reports
	return new RegExp(
		`Cannot find (module|package) ['"\`]?${escaped}['"\`]?`,
	).test(messageOf(error));
}

/** Bun rejects a bad specifier with a `ResolveMessage`, which is not an Error. */
function messageOf(error: unknown): string {
	if (error instanceof Error) return error.message;
	const message = (error as { message?: unknown } | null)?.message;
	return typeof message === "string" ? message : String(error);
}

function asError(error: unknown): Error | undefined {
	if (error instanceof Error) return error;
	if (error === null || typeof error !== "object") return undefined;
	const wrapped = new Error(messageOf(error));
	wrapped.name = (error as { name?: string }).name ?? "ResolveMessage";
	return wrapped;
}
