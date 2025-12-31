import { Guard, type GuardContract, type HttpRequest } from "./guard";
import { isClass } from "./utils/is-class";

function validateTokenFromRequest(req: HttpRequest) {
  if (!req.headers) return false;
  const [_, token] = req.headers.authorization?.split(" ") ?? [];
  if (!token) {
    return false;
  }
  return true;
}

class JwtGuard implements GuardContract {
  validate(req: HttpRequest): boolean | Promise<boolean> {
    return validateTokenFromRequest(req);
  }
}

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
