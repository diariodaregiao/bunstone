import { decodeJwt, jwtVerify, SignJWT } from "jose";
import { Inject, Injectable } from "@/core/injectable";
import { JWT_OPTIONS, type JwtOptions } from "./jwt.tokens";

type Claims = Record<string, unknown>;

export type SignOverrides = Partial<
	Pick<JwtOptions, "expiresIn" | "issuer" | "audience">
>;

@Injectable()
export class JwtService {
	private readonly key: Uint8Array;
	private readonly alg: string;

	constructor(@Inject(JWT_OPTIONS) private readonly options: JwtOptions) {
		this.key = new TextEncoder().encode(options.secret);
		this.alg = options.algorithm ?? "HS256";
	}

	async sign(payload: Claims, overrides: SignOverrides = {}): Promise<string> {
		const builder = new SignJWT(payload)
			.setProtectedHeader({ alg: this.alg })
			.setIssuedAt();

		const expiresIn = overrides.expiresIn ?? this.options.expiresIn;
		const issuer = overrides.issuer ?? this.options.issuer;
		const audience = overrides.audience ?? this.options.audience;

		if (expiresIn !== undefined) builder.setExpirationTime(expiresIn);
		if (issuer) builder.setIssuer(issuer);
		if (audience) builder.setAudience(audience);

		return builder.sign(this.key);
	}

	async verify<T extends Claims = Claims>(token: string): Promise<T | null> {
		try {
			const { payload } = await jwtVerify(token, this.key, {
				algorithms: [this.alg],
				issuer: this.options.issuer,
				audience: this.options.audience,
			});
			return payload as T;
		} catch {
			return null;
		}
	}

	decode<T extends Claims = Claims>(token: string): T {
		return decodeJwt(token) as T;
	}
}
