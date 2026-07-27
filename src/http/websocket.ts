import "reflect-metadata";
import type { ServerWebSocket } from "bun";
import type { Constructor } from "@/core/injectable";
import { Logger } from "@/utils/logger";
import type { WebSocketData } from "./types";

export type Socket = ServerWebSocket<WebSocketData>;

export interface WebSocketHandler {
	open?(socket: Socket): void | Promise<void>;
	message(socket: Socket, data: unknown): void | Promise<void>;
	close?(socket: Socket, code: number, reason: string): void | Promise<void>;
}

export const WEBSOCKET_GATEWAY_METADATA = "bunstone:websocket-gateway";

export function WebSocketGateway(path: string): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(
			WEBSOCKET_GATEWAY_METADATA,
			normalizeWsPath(path),
			target,
		);
	};
}

export function getGatewayPath(gateway: Constructor): string | undefined {
	return Reflect.getMetadata(WEBSOCKET_GATEWAY_METADATA, gateway);
}

export function normalizeWsPath(path: string): string {
	if (!path || path === "/") return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

export function collectGateways(
	instances: readonly unknown[],
): Map<string, WebSocketHandler> {
	const gateways = new Map<string, WebSocketHandler>();
	for (const instance of instances) {
		const ctor = (instance as { constructor?: Constructor })?.constructor;
		if (typeof ctor !== "function") continue;
		const path = getGatewayPath(ctor);
		if (path) gateways.set(path, instance as WebSocketHandler);
	}
	return gateways;
}

function decode(message: string | Buffer): unknown {
	const text = typeof message === "string" ? message : message.toString();
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

const logger = new Logger("WebSocket");

/**
 * A gateway callback is invoked by Bun, so a rejection has nowhere to surface.
 * Errors are caught and logged per event, the way scheduled jobs are, instead
 * of vanishing into a discarded promise.
 */
function guard(
	event: string,
	run: () => void | Promise<void>,
	onFailure?: () => void,
): void {
	const fail = (error: unknown) => {
		logger.error(`WebSocket "${event}" handler failed:`, error);
		onFailure?.();
	};
	try {
		// `Promise.resolve` also covers a non-native thenable
		Promise.resolve(run()).catch(fail);
	} catch (error) {
		fail(error);
	}
}

/** Open sockets, so shutdown can close them instead of leaving them dangling. */
const openSockets = new Set<Socket>();

export function closeOpenSockets(code = 1001, reason = "server shutting down") {
	for (const socket of openSockets) {
		try {
			socket.close(code, reason);
		} catch {}
	}
	openSockets.clear();
}

export function buildWebSocketHandler(gateways: Map<string, WebSocketHandler>) {
	return {
		open(socket: Socket) {
			openSockets.add(socket);
			// a gateway that rejects the connection in `open` must not be left
			// with a live socket that keeps receiving messages
			guard(
				"open",
				() => gateways.get(socket.data.path)?.open?.(socket),
				() => socket.close(1011, "handler failed"),
			);
		},
		message(socket: Socket, message: string | Buffer) {
			guard("message", () =>
				gateways.get(socket.data.path)?.message(socket, decode(message)),
			);
		},
		close(socket: Socket, code: number, reason: string) {
			openSockets.delete(socket);
			guard("close", () =>
				gateways.get(socket.data.path)?.close?.(socket, code, reason),
			);
		},
	};
}
