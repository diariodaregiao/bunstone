import "reflect-metadata";

/**
 * Decorator to define a timeout delay.
 * @param delay The delay in milliseconds.
 * @returns A method decorator.
 */
export function Timeout(delay: number) {
  if (!delay || delay < 0) {
    throw new Error("Delay must be a positive number.");
  }
  return function (target: any, propertyKey: string) {
    const sym = Symbol.for("dip:providers:timeouts");

    target[sym] = target[sym] || [];
    target[sym].push({
      delay,
      methodName: propertyKey,
      type: "timeout",
    });

    Reflect.defineMetadata("dip:timeout", "is_timeout", target, propertyKey);
  };
}
