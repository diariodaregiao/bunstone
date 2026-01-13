import { Guard } from "./guard";
import type { GuardContract } from "./interfaces/guard-contract";
import type { HttpRequest } from "./types/http-request";
import { isClass } from "./utils/is-class";

async function validateTokenFromRequest(req: HttpRequest) {
  if (!req.jwt) throw new Error("JWT middleware is not configured.");
  if (!req.headers) return false;

  const authHeader = req.headers.authorization || req.headers.authorization;
  const [_, token] = authHeader?.split(" ") ?? [];
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
export function Jwt(): any {
  return (target: any, propertyKey?: any, descriptor?: any) => {
    // Stage 3 decorator support
    if (
      propertyKey &&
      typeof propertyKey === "object" &&
      "kind" in propertyKey
    ) {
      const context = propertyKey as any;
      if (context.kind === "class") {
        Guard(JwtGuard)(target, context);
      } else if (context.kind === "method") {
        Guard(JwtGuard)(target, context);
      }
      return;
    }

    if (isClass(target)) {
      Guard(JwtGuard)(target);
      return;
    }

    if (propertyKey && descriptor) {
      Guard(JwtGuard)(target, propertyKey, descriptor);
    }
  };
}
