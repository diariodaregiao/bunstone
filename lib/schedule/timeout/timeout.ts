import "reflect-metadata";

/**
 * Decorator to define a timeout delay.
 * @param delay The delay in milliseconds.
 * @returns A method decorator.
 */
export function Timeout(delay: number): any {
  if (!delay || delay < 0) {
    throw new Error("Delay must be a positive number.");
  }
  return (target: any, propertyKey: string | symbol, _descriptor?: any) => {
    // Stage 3 support
    if (
      typeof propertyKey === "object" &&
      propertyKey !== null &&
      "kind" in propertyKey
    ) {
      return;
    }

    const sym = Symbol.for("dip:providers:timeouts");

    target[sym] = target[sym] || [];
    target[sym].push({
      delay,
      methodName: propertyKey as string,
      type: "timeout",
    });

    Reflect.defineMetadata("dip:timeout", "is_timeout", target, propertyKey);
  };
}
