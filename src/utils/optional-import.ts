import { ImportError } from "@/errors";

/**
 * Loads a driver the framework does not depend on. `load` is a thunk so the
 * specifier stays a literal at the call site and the bundler leaves it alone.
 * Anything other than "not installed" is rethrown untouched — wrapping a driver
 * that throws while evaluating would report a broken install as a missing one.
 */
export async function optionalImport<T>(
	load: () => Promise<T>,
	pkg: string,
	feature: string,
): Promise<T> {
	try {
		return await load();
	} catch (error) {
		if (!isModuleNotFound(error, pkg)) throw error;
		throw ImportError.missingDriver(pkg, feature, asError(error));
	}
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
