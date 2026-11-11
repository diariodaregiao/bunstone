import { ConfigurationError } from "@/errors";

/**
 * The part of the Standard Schema interface (https://standardschema.dev)
 * that `defineConfig` uses. Zod 4 schemas implement it, so does Valibot,
 * ArkType and others; nothing here imports a validation library.
 */
export interface ConfigSchema<Output extends object = object> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) =>
			ConfigValidationResult<Output> | Promise<ConfigValidationResult<Output>>;
		readonly types?: { readonly input: unknown; readonly output: Output };
	};
}

type ConfigValidationResult<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| {
			readonly issues: ReadonlyArray<{
				readonly message: string;
				readonly path?: ReadonlyArray<
					PropertyKey | { readonly key: PropertyKey }
				>;
			}>;
	  };

type Primitive = string | number | bigint | boolean | symbol | null | undefined;

/** `T` with every nested property `readonly`, as `defineConfig` freezes it. */
export type DeepReadonly<T> = T extends
	Primitive | ((...args: never[]) => unknown)
	? T
	: T extends ReadonlyArray<infer Item>
		? ReadonlyArray<DeepReadonly<Item>>
		: T extends Date | RegExp | URL
			? T
			: { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** The validated, frozen configuration a schema produces. */
export type InferConfig<S extends ConfigSchema> = DeepReadonly<
	NonNullable<S["~standard"]["types"]>["output"]
>;

export interface DefineConfigOptions {
	/**
	 * Where the variables come from. Defaults to `Bun.env`, which Bun fills
	 * from the process environment and the `.env` files it loads at startup.
	 * Pass a plain object to validate something else, e.g. in a test.
	 */
	env?: Record<string, string | undefined>;
}

/** A value shorter than this is too short to be a credential worth hiding. */
const MIN_REDACTED_LENGTH = 4;

/**
 * Validates the environment against `schema`, synchronously, and returns the
 * parsed result frozen. Every invalid or missing variable is reported at once
 * in a single `ConfigurationError` (`BNS-CFG-006`) that names the variables
 * and never contains their values.
 *
 * It reads the environment when called, never at import time.
 */
export function defineConfig<S extends ConfigSchema>(
	schema: S,
	options: DefineConfigOptions = {},
): InferConfig<S> {
	const source = { ...(options.env ?? Bun.env) };
	const result = schema["~standard"].validate(source);
	if (result instanceof Promise) {
		throw new ConfigurationError(
			"The configuration schema is asynchronous; `defineConfig` validates synchronously.",
			"BNS-CFG-006",
			"Remove async refinements or transforms from the schema. Configuration is validated once, at startup, before any module is registered.",
		);
	}
	if (result.issues) throw invalidConfig(result.issues, source);
	return deepFreeze(result.value) as InferConfig<S>;
}

type Issue = Extract<
	ConfigValidationResult<object>,
	{ issues: unknown }
>["issues"][number];

function invalidConfig(
	issues: readonly Issue[],
	source: Record<string, string | undefined>,
): ConfigurationError {
	const paths = issues.map((issue) =>
		(issue.path ?? []).map((segment) =>
			String(typeof segment === "object" ? segment.key : segment),
		),
	);
	// every value involved: a message may echo another variable's, too
	const secrets = paths
		.map((path) => (path[0] === undefined ? undefined : source[path[0]]))
		.filter(
			(raw): raw is string =>
				raw !== undefined && raw.length >= MIN_REDACTED_LENGTH,
		)
		.sort((a, b) => b.length - a.length);
	const lines: string[] = [];
	const variables: string[] = [];
	issues.forEach((issue, index) => {
		const path = paths[index] ?? [];
		const name = path.join(".") || "(root)";
		const missing =
			path.length === 1 && source[path[0] as string] === undefined;
		if (!variables.includes(name)) variables.push(name);
		lines.push(
			`- ${name}: ${missing ? "missing" : redact(issue.message, secrets)}`,
		);
	});
	const count = variables.length;
	return new ConfigurationError(
		`Invalid configuration: ${count} environment variable${count === 1 ? "" : "s"} failed validation.`,
		"BNS-CFG-006",
		[
			...lines,
			"Set them in the environment or in a .env file in the directory the process starts in.",
		].join("\n  "),
		{ variables },
	);
}

/** A custom error message may echo the value it rejected; never print it. */
function redact(message: string, secrets: readonly string[]): string {
	let safe = message;
	for (const secret of secrets) safe = safe.split(secret).join("[redacted]");
	return safe;
}

function deepFreeze<T>(value: T): T {
	if (
		value !== null &&
		typeof value === "object" &&
		(Array.isArray(value) || isPlainObject(value))
	) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}
