import "reflect-metadata";

export const EVENT_HANDLER_METADATA = "dip:cqrs:event-handler";

export const EventsHandler = (...events: any[]): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(EVENT_HANDLER_METADATA, events, target);
  };
};
