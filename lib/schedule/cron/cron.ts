import "reflect-metadata";

/**
 * Decorator to define a cron expression.
 * @param expression The cron expression string.
 * @returns A method decorator.
 */
export function Cron(expression: string): any {
  if (!expression) {
    throw new Error("Invalid cron expression.");
  }
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor?: any
  ) {
    // Stage 3 support
    if (
      typeof propertyKey === "object" &&
      propertyKey !== null &&
      "kind" in propertyKey
    ) {
      const context = propertyKey as any;
      const methodName = context.name;
      const sym = Symbol.for("dip:providers:crons");

      // In Stage 3, target is the method. We need to find a way to attach to the prototype or handle it.
      // For now, we'll just satisfy the signature.
      return;
    }

    const sym = Symbol.for("dip:providers:crons");

    target[sym] = target[sym] || [];
    target[sym].push({
      expression,
      methodName: propertyKey as string,
      type: "cron",
    });

    Reflect.defineMetadata("dip:cron", "is_cron", target, propertyKey);
  };
}
