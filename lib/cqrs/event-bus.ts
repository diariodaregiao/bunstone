import { metrics as otelMetrics, trace } from "@opentelemetry/api";
import { Injectable } from "../injectable";
import { EVENT_HANDLER_METADATA } from "./decorators/event-handler.decorator";
import type { IEvent, IEventHandler } from "./interfaces/event.interface";

export type IEventStream = {
	pipe: (...operators: any[]) => IEventStream;
	subscribe: (callback: (event: IEvent) => void) => void;
};

class EventStream implements IEventStream {
	constructor(private source: (callback: (event: IEvent) => void) => void) {}

	pipe(...operators: any[]): IEventStream {
		let currentSource = this.source;

		operators.forEach((operator) => {
			const prevSource = currentSource;
			currentSource = (callback) => {
				prevSource((event) => {
					operator(event, callback);
				});
			};
		});

		return new EventStream(currentSource);
	}

	subscribe(callback: (event: IEvent) => void) {
		this.source(callback);
	}
}

/**
 * Bus for publishing and subscribing to events.
 * Supports event handlers and reactive streams (Sagas).
 */
@Injectable()
export class EventBus {
	private handlers = new Map<any, IEventHandler[]>();
	private listeners: ((event: IEvent) => void)[] = [];

	/**
	 * Registers a list of event handlers.
	 * @param handlers Array of event handler instances.
	 */
	register(handlers: IEventHandler[]) {
		handlers.forEach((handler) => {
			const events = Reflect.getMetadata(
				EVENT_HANDLER_METADATA,
				handler.constructor,
			);
			if (Array.isArray(events)) {
				events.forEach((event) => {
					if (!this.handlers.has(event)) {
						this.handlers.set(event, []);
					}
					const handlersForEvent = this.handlers.get(event);
					if (handlersForEvent && !handlersForEvent?.includes(handler)) {
						handlersForEvent.push(handler);
					}
				});
			}
		});
	}

	/**
	 * Publishes an event to all registered handlers and listeners.
	 * @param event The event instance to publish.
	 */
	publish<T extends IEvent>(event: T): void {
		const eventName = event.constructor.name;

		// Record an OTel span for the event publish operation
		const span = trace
			.getTracer("bunstone.cqrs")
			.startSpan(`event.publish ${eventName}`, {
				attributes: {
					"cqrs.type": "event",
					"cqrs.event.name": eventName,
				},
			});

		try {
			const eventType = event.constructor;
			const handlers = this.getHandlers(eventType);
			handlers.forEach((handler) => {
				handler.handle(event);
			});

			// Notify generic listeners (Sagas)
			this.listeners.forEach((listener) => {
				listener(event);
			});
		} finally {
			span.end();
			try {
				otelMetrics
					.getMeter("bunstone")
					.createCounter("cqrs.event.publish.count", {
						description: "Total number of CQRS events published",
					})
					.add(1, { "cqrs.event.name": eventName });
			} catch {
				// best-effort
			}
		}
	}

	/**
	 * Returns a stream of events for reactive processing.
	 * Used primarily by Sagas.
	 */
	get stream(): IEventStream {
		return new EventStream((callback) => {
			this.listeners.push(callback);
		});
	}

	private getHandlers(eventType: any): IEventHandler[] {
		const exactHandlers = this.handlers.get(eventType);
		if (exactHandlers) {
			return exactHandlers;
		}

		if (typeof eventType !== "function" || !eventType.name) {
			return [];
		}

		const matchedHandlers: IEventHandler[] = [];
		for (const [registeredType, handlers] of this.handlers.entries()) {
			if (
				typeof registeredType === "function" &&
				registeredType.name === eventType.name
			) {
				for (const handler of handlers) {
					if (!matchedHandlers.includes(handler)) {
						matchedHandlers.push(handler);
					}
				}
			}
		}

		return matchedHandlers;
	}
}

/**
 * Filters events by type in a Saga stream.
 * @param types The event classes to filter by.
 */
export const ofType = (...types: any[]) => {
	return (event: IEvent, next: (event: IEvent) => void) => {
		if (types.some((type) => event instanceof type)) {
			next(event);
		}
	};
};

/**
 * Transforms events in a Saga stream.
 * @param fn The transformation function.
 */
export const map = (fn: (event: any) => any) => {
	return (event: IEvent, next: (result: any) => void) => {
		const result = fn(event);
		if (result) {
			next(result);
		}
	};
};
