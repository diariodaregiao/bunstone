import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export interface SseMessage {
	data: unknown;
	event?: string;
	id?: string;
	retry?: number;
}

export interface SseOptions {
	heartbeatMs?: number;
}

export const SSE_METADATA = "bunstone:sse";

export function Sse(options: SseOptions = {}): MethodDecorator {
	return (target, propertyKey) => {
		Reflect.defineMetadata(
			SSE_METADATA,
			options,
			target,
			propertyKey as string,
		);
	};
}

export function getSseOptions(
	controller: Constructor,
	handlerName: string,
): SseOptions | undefined {
	return Reflect.getMetadata(SSE_METADATA, controller.prototype, handlerName);
}

function normalize(message: SseMessage | unknown): SseMessage {
	if (
		message !== null &&
		typeof message === "object" &&
		"data" in (message as SseMessage)
	) {
		return message as SseMessage;
	}
	return { data: message };
}

/** A newline in a field would forge extra frame lines, so strip them. */
function singleLine(value: string): string {
	return value.replace(/[\r\n]+/g, " ");
}

export function formatEvent(message: SseMessage): string {
	let frame = "";
	if (message.event) frame += `event: ${singleLine(message.event)}\n`;
	if (message.id) frame += `id: ${singleLine(message.id)}\n`;
	if (message.retry) frame += `retry: ${Math.trunc(message.retry)}\n`;
	// `JSON.stringify(undefined)` is undefined, which would throw on `.split`
	const data =
		typeof message.data === "string"
			? message.data
			: (JSON.stringify(message.data) ?? "");
	for (const line of data.split("\n")) frame += `data: ${line}\n`;
	return `${frame}\n`;
}

export function sseResponse(
	source: AsyncIterable<SseMessage | unknown>,
	options: { signal?: AbortSignal; heartbeatMs?: number } = {},
): Response {
	const encoder = new TextEncoder();

	const iterator = source[Symbol.asyncIterator]();
	let heartbeat: ReturnType<typeof setInterval> | undefined;
	let onAbort: (() => void) | undefined;
	let finished = false;

	/**
	 * Idempotent, and reachable from the abort listener as well as from the
	 * stream itself — otherwise a client that disconnects mid-generator leaves
	 * the heartbeat and the listener running until the generator next yields,
	 * which may be never.
	 */
	const cleanup = (): void => {
		if (finished) return;
		finished = true;
		if (heartbeat) clearInterval(heartbeat);
		if (onAbort) options.signal?.removeEventListener("abort", onAbort);
		void iterator.return?.(undefined);
	};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			if (options.heartbeatMs) {
				heartbeat = setInterval(() => {
					// skip the ping when the consumer is already behind
					if ((controller.desiredSize ?? 1) > 0) {
						safeEnqueue(controller, encoder.encode(": ping\n\n"));
					}
				}, options.heartbeatMs);
			}
			onAbort = () => {
				cleanup();
				safeClose(controller);
			};
			options.signal?.addEventListener("abort", onAbort);
		},

		// pull-driven, so a client that stops reading stops the producer instead
		// of letting it run ahead and buffer the whole dataset in memory
		async pull(controller) {
			if (options.signal?.aborted || finished) {
				cleanup();
				safeClose(controller);
				return;
			}
			try {
				const { value, done } = await iterator.next();
				if (done) {
					cleanup();
					safeClose(controller);
					return;
				}
				safeEnqueue(controller, encoder.encode(formatEvent(normalize(value))));
			} catch {
				cleanup();
				safeClose(controller);
			}
		},

		cancel() {
			cleanup();
		},
	});

	return new Response(stream, {
		headers: {
			"content-type": "text/event-stream",
			"cache-control": "no-cache",
			connection: "keep-alive",
		},
	});
}

function safeEnqueue(
	controller: ReadableStreamDefaultController<Uint8Array>,
	chunk: Uint8Array,
): void {
	try {
		controller.enqueue(chunk);
	} catch {}
}

function safeClose(
	controller: ReadableStreamDefaultController<Uint8Array>,
): void {
	try {
		controller.close();
	} catch {}
}
