import { Injectable } from "../injectable";
import { EVENT_HANDLER_METADATA } from "./decorators/event-handler.decorator";
import type { IEvent, IEventHandler } from "./interfaces/event.interface";

@Injectable()
export class EventBus {
  private handlers = new Map<any, IEventHandler[]>();

  register(handlers: IEventHandler[]) {
    handlers.forEach((handler) => {
      const events = Reflect.getMetadata(EVENT_HANDLER_METADATA, handler.constructor);
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
  }
}
