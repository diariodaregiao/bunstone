import "reflect-metadata";

/**
 * Decorator that marks a class as available to be injected as a dependency.
 * Classes decorated with `@Injectable()` can be managed by the Bunstone DI container.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {}
 * ```
 */
export function Injectable(): any {
  return function (target: any, context?: any) {
    Reflect.defineMetadata("injectable", true, target);
  };
}
