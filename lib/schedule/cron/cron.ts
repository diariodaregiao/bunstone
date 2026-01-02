import "reflect-metadata";

/**
 * Decorator to define a cron expression.
 * @param expression The cron expression string.
 * @returns A method decorator.
 */
export function Cron(expression: string) {
  if (!expression) {
    throw new Error("Invalid cron expression.");
  }
  return function (target: any, propertyKey: string) {
    const sym = Symbol.for("dip:providers:crons");

    target[sym] = target[sym] || [];
    target[sym].push({
      expression,
      methodName: propertyKey,
      type: "cron",
    });

    Reflect.defineMetadata("dip:cron", "is_cron", target, propertyKey);
  };
}
