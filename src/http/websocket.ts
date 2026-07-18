import "reflect-metadata";
import type { ServerWebSocket } from "bun";
import type { Constructor } from "@/core/injectable";
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

export function buildWebSocketHandler(gateways: Map<string, WebSocketHandler>) {
	return {
		open(socket: Socket) {
			void gateways.get(socket.data.path)?.open?.(socket);
		},
		message(socket: Socket, message: string | Buffer) {
			void gateways.get(socket.data.path)?.message(socket, decode(message));
		},
		close(socket: Socket, code: number, reason: string) {
			void gateways.get(socket.data.path)?.close?.(socket, code, reason);
		},
	};
}
