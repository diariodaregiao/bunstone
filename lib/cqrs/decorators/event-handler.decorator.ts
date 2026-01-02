import "reflect-metadata";

export const EVENT_HANDLER_METADATA = "dip:cqrs:event-handler";

/**
 * Decorator that marks a class as an event handler.
 * @param events The event classes that this handler handles.
 */
export const EventsHandler = (...events: any[]): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(EVENT_HANDLER_METADATA, events, target);
  };
};
