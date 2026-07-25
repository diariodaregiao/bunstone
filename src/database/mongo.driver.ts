import { optionalImport } from "@/utils/optional-import";

export type MongoDriver = typeof import("mongodb");

let driver: Promise<MongoDriver> | undefined;

/**
 * `mongodb` is an optional peer: a SQL-only project must not be made to install
 * it. The import is dynamic, cached, and its resolution failure is translated
 * here — once — rather than surfacing Bun's raw module error from whichever
 * call site happened to touch Mongo first.
 */
export function loadMongoDriver(): Promise<MongoDriver> {
	driver ??= optionalImport(
		() => import("mongodb"),
		"mongodb",
		"MongoModule",
	).catch((error: unknown) => {
		// a failed load must not poison a later attempt after the install
		driver = undefined;
		throw error;
	});
	return driver;
}
