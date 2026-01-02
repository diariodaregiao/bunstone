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

@Injectable()
export class EventBus {
  private handlers = new Map<any, IEventHandler[]>();
  private listeners: ((event: IEvent) => void)[] = [];

  register(handlers: IEventHandler[]) {
    handlers.forEach((handler) => {
      const events = Reflect.getMetadata(
        EVENT_HANDLER_METADATA,
        handler.constructor
      );
      if (Array.isArray(events)) {
        events.forEach((event) => {
          if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
          }
          this.handlers.get(event)?.push(handler);
        });
      }
    });
  }

  publish<T extends IEvent>(event: T): void {
    const eventType = event.constructor;
    const handlers = this.handlers.get(eventType) || [];
    handlers.forEach((handler) => handler.handle(event));

    // Notify generic listeners (Sagas)
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Returns a stream of events.
   * Simplified version of RxJS for Sagas.
   */
  get stream(): IEventStream {
    return new EventStream((callback) => {
      this.listeners.push(callback);
    });
  }
}

/**
 * Simplified ofType operator for Sagas
 */
export const ofType = (...types: any[]) => {
  return (event: IEvent, next: (event: IEvent) => void) => {
    if (types.some((type) => event instanceof type)) {
      next(event);
    }
  };
};

/**
 * Simplified map operator for Sagas
 */
export const map = (fn: (event: any) => any) => {
  return (event: IEvent, next: (result: any) => void) => {
    const result = fn(event);
    if (result) {
      next(result);
    }
  };
};
