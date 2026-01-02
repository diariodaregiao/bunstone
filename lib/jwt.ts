import { Guard, type GuardContract, type HttpRequest } from "./guard";
import { isClass } from "./utils/is-class";

async function validateTokenFromRequest(req: HttpRequest) {
  if (!req.jwt) throw new Error("JWT middleware is not configured.");
  if (!req.headers) return false;

  const [_, token] = req.headers.authorization?.split(" ") ?? [];
  if (!token) {
    return false;
  }

  const result = await req.jwt.verify(token);

  return result !== false;
}

class JwtGuard implements GuardContract {
  async validate(req: HttpRequest): Promise<boolean> {
    return await validateTokenFromRequest(req);
  }
}

/**
 * Decorator to define an injectable class. Don`t necessary instantiate nanually
 * @returns A class decorator.
 */
export function Jwt() {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (isClass(target)) {
      Guard(JwtGuard)(target);
      return;
    }

    Guard(JwtGuard)(target, propertyKey!, descriptor!);
  };
}
