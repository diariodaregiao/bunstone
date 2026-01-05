import "reflect-metadata";

export const SAGA_METADATA = "dip:cqrs:saga";

/**
 * Decorator that marks a property as a Saga.
 * Sagas are reactive event streams that can dispatch commands or other events.
 */
export const Saga = (): any => {
  return (target: object, propertyKey: string | symbol, context?: any) => {
    // Stage 3 support
    if (
      typeof propertyKey === "object" &&
      propertyKey !== null &&
      "kind" in propertyKey
    ) {
      // In Stage 3, target is the class/prototype depending on context.
      // For now, we just satisfy the signature.
      return;
    }

    const properties =
      Reflect.getMetadata(SAGA_METADATA, target.constructor) || [];
    Reflect.defineMetadata(
      SAGA_METADATA,
      [...properties, propertyKey],
      target.constructor
    );
  };
};
