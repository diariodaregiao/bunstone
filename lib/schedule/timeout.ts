export function Timeout(delay: number) {
  if (!delay || delay < 0) {
    throw new Error("Delay must be a positive number.");
  }
  return function (target: any, propertyKey: string) {
    const sym = Symbol.for("dip:providers:timeouts" + propertyKey);
    target[sym] = {
      delay,
      methodName: propertyKey,
      type: "timeout",
    };
    Reflect.defineMetadata("dip:timeout", "is_timeout", target, propertyKey);
  };
}
