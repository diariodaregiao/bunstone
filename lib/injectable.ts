import "reflect-metadata";

/**
 * Decorator to define an injectable class. Don`t necessary instantiate nanually
 * @returns A class decorator.
 */
export function Injectable() {
  return function (target: any) {
    Reflect.defineMetadata("injectable", true, target);
  };
}
