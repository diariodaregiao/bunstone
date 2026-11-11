import type {
	CallToolResult,
	GetPromptResult,
	InputRequiredResult,
	PromptMessage,
	ReadResourceResult,
} from "@modelcontextprotocol/server";
import { HttpException } from "@/http/exceptions";
import { serverSdk } from "./sdk";

/** What a client is told about an error that is not meant for it. */
export const INTERNAL_ERROR_MESSAGE = "Internal server error";

const TOOL_RESULT_KEYS = new Set([
	"content",
	"structuredContent",
	"isError",
	"resultType",
	"_meta",
]);
const RESOURCE_RESULT_KEYS = new Set([
	"contents",
	"ttlMs",
	"cacheScope",
	"resultType",
	"_meta",
]);

function hasOnlyKeys(value: object, keys: Set<string>): boolean {
	return Object.keys(value).every((key) => keys.has(key));
}

/**
 * A tool method's return value as a `CallToolResult`: one (or an
 * `inputRequired()` result) as is, a string as a text block, nothing as no
 * content, anything else as JSON text, and that JSON as `structuredContent`
 * too when the tool has an output schema.
 *
 * A value shaped like a result but without `structuredContent` (when one is
 * required) is the tool's data, not a result — a DTO with a `content` array.
 */
export function toCallToolResult(
	value: unknown,
	structured: boolean,
): CallToolResult | InputRequiredResult {
	const { isCallToolResult, isInputRequiredResult } = serverSdk();
	if (isInputRequiredResult(value)) return value;
	if (
		isCallToolResult(value) &&
		(value.content.length > 0 || hasOnlyKeys(value, TOOL_RESULT_KEYS)) &&
		(!structured ||
			value.isError === true ||
			value.structuredContent !== undefined)
	) {
		return value;
	}
	if (value === undefined || (value === null && !structured)) {
		return { content: [] };
	}
	if (typeof value === "string") {
		return {
			content: [{ type: "text", text: value }],
			...(structured && { structuredContent: value as never }),
		};
	}
	const text = JSON.stringify(value);
	return {
		content: [{ type: "text", text }],
		// validated as the JSON the client receives, so a Date is checked as its string
		...(structured &&
			text !== undefined && {
				structuredContent: JSON.parse(
					text,
				) as CallToolResult["structuredContent"],
			}),
	};
}

/**
 * A resource method's return value as a `ReadResourceResult` for `uri`: one as
 * is, a string as text, bytes as a base64 blob, nothing as no contents, any
 * other value as JSON.
 */
export function toReadResourceResult(
	value: unknown,
	uri: URL,
	mimeType: string | undefined,
): ReadResourceResult | InputRequiredResult {
	const { isInputRequiredResult, isSpecType } = serverSdk();
	if (isInputRequiredResult(value)) return value;
	if (
		isSpecType.ReadResourceResult(value) &&
		(value.contents.length > 0 || hasOnlyKeys(value, RESOURCE_RESULT_KEYS))
	) {
		return value;
	}
	if (value === undefined || value === null) return { contents: [] };
	if (typeof value === "string") {
		return {
			contents: [{ uri: uri.href, ...(mimeType && { mimeType }), text: value }],
		};
	}
	if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
		const bytes =
			value instanceof ArrayBuffer
				? new Uint8Array(value)
				: new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
		return {
			contents: [
				{
					uri: uri.href,
					mimeType: mimeType ?? "application/octet-stream",
					blob: bytes.toBase64(),
				},
			],
		};
	}
	return {
		contents: [
			{
				uri: uri.href,
				mimeType: mimeType ?? "application/json",
				text: JSON.stringify(value),
			},
		],
	};
}

/**
 * A prompt method's return value as a `GetPromptResult`: one with `messages`
 * as is, an array as the messages, a string as one user message.
 */
export function toGetPromptResult(
	value: unknown,
	description: string | undefined,
): GetPromptResult | InputRequiredResult {
	const { isInputRequiredResult } = serverSdk();
	if (isInputRequiredResult(value)) return value;
	if (
		value &&
		typeof value === "object" &&
		Array.isArray((value as GetPromptResult).messages)
	) {
		return value as GetPromptResult;
	}
	if (Array.isArray(value)) {
		return {
			...(description && { description }),
			messages: value as PromptMessage[],
		};
	}
	if (typeof value === "string") {
		return {
			...(description && { description }),
			messages: [{ role: "user", content: { type: "text", text: value } }],
		};
	}
	throw new TypeError(
		`A prompt returns a string, an array of prompt messages or a GetPromptResult; got ${value === null ? "null" : typeof value}.`,
	);
}

/** The message an `HttpException` carries in its response body. */
export function httpExceptionMessage(exception: HttpException): string {
	const message = (exception.getResponse() as { message?: unknown })?.message;
	if (Array.isArray(message)) return message.map(String).join("; ");
	return typeof message === "string" ? message : exception.message;
}

/**
 * A tool's failure, as the result the model reads (`isError: true`): an
 * `HttpException`'s or a protocol error's message, `Internal server error` for
 * anything else. The URL elicitation error is the one a tool must propagate as
 * a JSON-RPC error, as the spec requires.
 */
export function toolErrorResult(error: unknown): CallToolResult {
	const { ProtocolError, ProtocolErrorCode } = serverSdk();
	if (
		error instanceof ProtocolError &&
		error.code === ProtocolErrorCode.UrlElicitationRequired
	) {
		throw error;
	}
	const text =
		error instanceof HttpException
			? httpExceptionMessage(error)
			: error instanceof ProtocolError
				? error.message
				: INTERNAL_ERROR_MESSAGE;
	return { content: [{ type: "text", text }], isError: true };
}

/**
 * A resource's or prompt's failure, as the JSON-RPC error the client gets: a
 * 404 as resource-not-found (invalid params for a prompt), a 400 or 422 as
 * invalid params, another `HttpException` as an internal error with its
 * message, anything else as `Internal server error`.
 */
export function toProtocolError(error: unknown, uri?: URL): Error {
	const { ProtocolError, ProtocolErrorCode, ResourceNotFoundError } =
		serverSdk();
	if (error instanceof ProtocolError) return error;
	if (error instanceof HttpException) {
		const status = error.getStatus();
		const message = httpExceptionMessage(error);
		if (status === 404 && uri) return new ResourceNotFoundError(uri.href);
		if (status === 400 || status === 404 || status === 422) {
			return new ProtocolError(ProtocolErrorCode.InvalidParams, message);
		}
		return new ProtocolError(ProtocolErrorCode.InternalError, message, {
			status,
		});
	}
	return new ProtocolError(
		ProtocolErrorCode.InternalError,
		INTERNAL_ERROR_MESSAGE,
	);
}
