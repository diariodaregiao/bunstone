import type { JWTOption } from "@elysiajs/jwt";
import "reflect-metadata";

/**
 * Module for configuring JWT authentication.
 */
export class JwtModule {
  private static options: JWTOption;

  /**
   * Configures the JWT options for the application.
   * @param options JWT configuration options (secret, algorithm, expiration, etc.).
   */
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
