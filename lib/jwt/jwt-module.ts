import type { JWTOption } from "@elysiajs/jwt";
import "reflect-metadata";

export class JwtModule {
  private static options: JWTOption;

  static register(options: JWTOption) {
    this.options = {
      ...options,
      alg: options.alg || "HS256",
      exp: options.exp || "7d",
    };

    Reflect.defineMetadata("dip:module:jwt", true, JwtModule);
    Reflect.defineMetadata("dip:module:jwt:options", this.options, JwtModule);

    return this;
  }
}
