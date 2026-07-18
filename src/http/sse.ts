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
	return Reflect.getOwnMetadata(
		SSE_METADATA,
		controller.prototype,
		handlerName,
	);
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

export function formatEvent(message: SseMessage): string {
	let frame = "";
	if (message.event) frame += `event: ${message.event}\n`;
	if (message.id) frame += `id: ${message.id}\n`;
	if (message.retry) frame += `retry: ${message.retry}\n`;
	const data =
		typeof message.data === "string"
			? message.data
			: JSON.stringify(message.data);
	for (const line of data.split("\n")) frame += `data: ${line}\n`;
	return `${frame}\n`;
}

export function sseResponse(
	source: AsyncIterable<SseMessage | unknown>,
	options: { signal?: AbortSignal; heartbeatMs?: number } = {},
): Response {
	const encoder = new TextEncoder();

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const heartbeat = options.heartbeatMs
				? setInterval(() => {
						safeEnqueue(controller, encoder.encode(": ping\n\n"));
					}, options.heartbeatMs)
				: undefined;

			const onAbort = () => safeClose(controller);
			options.signal?.addEventListener("abort", onAbort);

			try {
				for await (const message of source) {
					if (options.signal?.aborted) break;
					safeEnqueue(
						controller,
						encoder.encode(formatEvent(normalize(message))),
					);
				}
			} catch {
			} finally {
				if (heartbeat) clearInterval(heartbeat);
				options.signal?.removeEventListener("abort", onAbort);
				safeClose(controller);
			}
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
