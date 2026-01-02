import type { HttpRequest } from "../types/http-request";

/** Interface for a guard contract that validates HTTP requests.
 * @property validate(req: HttpRequest): boolean | Promise<boolean> - Method to validate an HTTP request, returning a boolean or a Promise that resolves to a boolean.
 */
export interface GuardContract {
  validate(req: HttpRequest): boolean | Promise<boolean>;
}
