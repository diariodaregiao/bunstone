import { BunstoneError } from "@/errors";

export type StorageErrorCode =
	"BNS-STG-001" | "BNS-STG-002" | "BNS-STG-003" | "BNS-STG-004" | "BNS-STG-005";

/** S3 error codes that mean the credentials are wrong or lack permission. */
const DENIED = new Set([
	"AccessDenied",
	"InvalidAccessKeyId",
	"SignatureDoesNotMatch",
	"ExpiredToken",
	"InvalidToken",
	"TokenRefreshRequired",
	"AllAccessDisabled",
	"ERR_S3_INVALID_SIGNATURE",
]);

/** Transport failures: the endpoint never answered. */
const UNREACHABLE = new Set([
	"ConnectionRefused",
	"ConnectionClosed",
	"ECONNREFUSED",
	"ECONNRESET",
	"ENOTFOUND",
	"ETIMEDOUT",
	"Timeout",
	"FailedToOpenSocket",
	"UnableToConnect",
]);

/** Rejected by Bun before any request: the options or the key are invalid. */
const CONFIGURATION = new Set([
	"ERR_S3_MISSING_CREDENTIALS",
	"ERR_S3_INVALID_PATH",
	"ERR_S3_INVALID_ENDPOINT",
	"ERR_S3_INVALID_METHOD",
	"ERR_S3_INVALID_SESSION_TOKEN",
	"InvalidBucketName",
]);

/**
 * An object-storage failure. The S3 error code the server (or Bun) reported is
 * kept in `context.s3Code` and the original error in `cause`.
 */
export class StorageError extends BunstoneError {
	constructor(
		message: string,
		code: StorageErrorCode = "BNS-STG-001",
		suggestion?: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, code, suggestion, context, cause);
	}

	/** Maps whatever `Bun.S3Client` threw to a typed, actionable error. */
	static from(
		error: unknown,
		operation: string,
		key: string | undefined,
		bucket: string | undefined,
	): StorageError {
		if (error instanceof StorageError) return error;
		const cause = error instanceof Error ? error : new Error(String(error));
		const s3Code = s3CodeOf(error);
		const target = key === undefined ? "" : ` "${key}"`;
		const context = { operation, key, bucket, s3Code };

		if (s3Code === "NoSuchBucket") {
			return new StorageError(
				`Storage ${operation}${target} failed: the bucket${bucket ? ` "${bucket}"` : ""} does not exist.`,
				"BNS-STG-003",
				"Create the bucket first, or fix `bucket` in StorageModule.register(...) (or S3_BUCKET).",
				context,
				cause,
			);
		}
		if (s3Code && DENIED.has(s3Code)) {
			return new StorageError(
				`Storage ${operation}${target} was denied (${s3Code}).`,
				"BNS-STG-002",
				[
					"Check `accessKeyId` / `secretAccessKey` (or S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY),",
					"and that this key is allowed to perform the operation on the bucket.",
				].join("\n  "),
				context,
				cause,
			);
		}
		if (s3Code && UNREACHABLE.has(s3Code)) {
			return new StorageError(
				`Storage ${operation}${target} failed: the endpoint is unreachable (${s3Code}).`,
				"BNS-STG-004",
				"Check `endpoint` in StorageModule.register(...) (or S3_ENDPOINT) and that the service is up.",
				context,
				cause,
			);
		}
		if (s3Code && CONFIGURATION.has(s3Code)) {
			return new StorageError(
				`Storage ${operation}${target} was rejected: ${cause.message}`,
				"BNS-STG-005",
				"Check StorageModule.register(...) (or the S3_* env vars): credentials, endpoint and bucket must be set, and object keys must be non-empty.",
				context,
				cause,
			);
		}
		return new StorageError(
			`Storage ${operation}${target} failed${s3Code ? ` (${s3Code})` : ""}: ${cause.message}`,
			"BNS-STG-001",
			"The S3 service rejected the request; `cause` holds the original error.",
			context,
			cause,
		);
	}

	static noPublicUrl(key: string): StorageError {
		return new StorageError(
			`Cannot build a public URL for "${key}": no \`publicUrl\` is configured.`,
			"BNS-STG-005",
			"Pass `publicUrl` to StorageModule.register(...), or use `presign(key)` for a private bucket.",
			{ key },
		);
	}
}

export function s3CodeOf(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}
