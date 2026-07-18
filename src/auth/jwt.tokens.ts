import { InjectionToken } from "@/core/injectable";

export interface JwtOptions {
	secret: string;
	algorithm?: string;
	expiresIn?: string | number;
	issuer?: string;
	audience?: string | string[];
}

export const JWT_OPTIONS = new InjectionToken<JwtOptions>("JwtOptions");
