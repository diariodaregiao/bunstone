import "reflect-metadata";

export const SAGA_METADATA = "dip:cqrs:saga";

/**
 * Decorator that marks a property as a Saga.
 * Sagas are reactive event streams that can dispatch commands or other events.
 */
export const Saga = (): PropertyDecorator => {
  return (target: object, propertyKey: string | symbol) => {
    const properties =
      Reflect.getMetadata(SAGA_METADATA, target.constructor) || [];
    Reflect.defineMetadata(
      SAGA_METADATA,
      [...properties, propertyKey],
      target.constructor
    );
  };
};
