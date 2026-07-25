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
		throw ImportError.missingDriver(
			pkg,
			feature,
			error instanceof Error ? error : undefined,
		);
	}
}

function isModuleNotFound(error: unknown, pkg: string): boolean {
	const code = (error as { code?: unknown } | null)?.code;
	if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error);
	const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`Cannot find (module|package) ['"]?${escaped}`).test(
		message,
	);
}
