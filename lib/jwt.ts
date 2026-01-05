import { Guard } from "./guard";
import type { GuardContract } from "./interfaces/guard-contract";
import { type HttpRequest } from "./types/http-request";
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
 * Decorator that enables JWT protection for a controller or a specific method.
 * Requires the JwtModule to be configured in the root module.
 */
export function Jwt() {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ) {
    if (isClass(target)) {
      Guard(JwtGuard)(target);
      return;
    }

    Guard(JwtGuard)(target, propertyKey!, descriptor!);
  };
}
