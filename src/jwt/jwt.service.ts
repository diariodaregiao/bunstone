import { type JWTOption, type JWTPayloadSpec } from "@elysiajs/jwt";
import { decodeJwt, jwtVerify, SignJWT } from "jose";
import { ConfigurationError } from "../errors";
import { JwtModule } from "./jwt-module";

/**
 * Service for JWT operations: sign, verify, and decode tokens.
 *
 * Requires `JwtModule.register()` to be called before instantiating.
 *
 * @example
 * ```ts
 * // Register in your root module
 * JwtModule.register({ secret: "my-secret", exp: "7d" });
 *
 * // Use the service
 * const jwtService = new JwtService();
 * const token = await jwtService.sign({ sub: "user-id", role: "admin" });
 * const payload = await jwtService.verify(token);
 * const decoded = jwtService.decode(token);
 * ```
 */
export class JwtService {
	private secret: Uint8Array;
	private options: JWTOption;

	constructor() {
		const options: JWTOption = Reflect.getMetadata(
			"dip:module:jwt:options",
			JwtModule,
		);

		if (!options?.secret) {
			throw new ConfigurationError(
				"JWT is not configured.",
				"BNS-CFG-002",
				"Call JwtModule.register({ secret: '...' }) in your root module before using JwtService.",
			);
		}

		this.options = options;
		this.secret =
			typeof options.secret === "string"
				? new TextEncoder().encode(options.secret)
				: (options.secret as Uint8Array);
	}

	/**
	 * Signs a JWT token with the configured secret and algorithm.
	 *
	 * @param payload - The claims/payload to embed in the token.
	 * @param overrides - Optional per-call overrides (e.g. custom `exp`).
	 * @returns Signed JWT string.
	 *
	 * @example
	 * ```ts
	 * const token = await jwtService.sign({ sub: "123", role: "admin" });
	 * const shortLived = await jwtService.sign({ sub: "123" }, { exp: "1h" });
	 * ```
	 */
	async sign(
		payload: Record<string, unknown>,
		overrides?: Partial<Pick<JWTOption, "exp" | "iss" | "aud" | "nbf">>,
	): Promise<string> {
		const alg = (this.options.alg as string) || "HS256";
		const exp = overrides?.exp ?? this.options.exp;
		const iss = overrides?.iss ?? this.options.iss;
		const aud = overrides?.aud ?? this.options.aud;
		const nbf = overrides?.nbf ?? this.options.nbf;

		const builder = new SignJWT(payload).setProtectedHeader({ alg });

		if (exp) builder.setExpirationTime(exp as string | number);
		if (iss) builder.setIssuer(iss as string);
		if (aud) builder.setAudience(Array.isArray(aud) ? aud : (aud as string));
		if (nbf) builder.setNotBefore(nbf as string | number);

		return builder.sign(this.secret);
	}

	/**
	 * Verifies a JWT token signature and expiration.
	 *
	 * @param token - The JWT string to verify.
	 * @returns The decoded payload typed as `T`, or `false` if invalid/expired.
	 *
	 * @example
	 * ```ts
	 * const payload = await jwtService.verify<{ sub: string; role: string }>(token);
	 * if (!payload) throw new Error("Unauthorized");
	 * ```
	 */
	async verify<T extends Record<string, unknown> = Record<string, unknown>>(
		token: string,
	): Promise<(T & JWTPayloadSpec) | false> {
		try {
			const { payload } = await jwtVerify(token, this.secret);
			return payload as T & JWTPayloadSpec;
		} catch {
			return false;
		}
	}

	/**
	 * Decodes a JWT token **without** verifying the signature.
	 * Useful for reading claims without signature validation (e.g. logging, debugging).
	 *
	 * ⚠️ Do NOT use this for authentication — always use `verify()` for that.
	 *
	 * @param token - The JWT string to decode.
	 * @returns The decoded payload typed as `T`.
	 *
	 * @example
	 * ```ts
	 * const claims = jwtService.decode<{ sub: string }>(token);
	 * console.log(claims.sub);
	 * ```
	 */
	decode<T extends Record<string, unknown> = Record<string, unknown>>(
		token: string,
	): T & JWTPayloadSpec {
		return decodeJwt(token) as T & JWTPayloadSpec;
	}
}
