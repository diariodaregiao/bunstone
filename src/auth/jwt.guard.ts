import { Injectable } from "@/core/injectable";
import { UnauthorizedException } from "@/http/exceptions";
import type { GuardContract } from "@/http/guard";
import type { RequestContext } from "@/http/types";
import { JwtService } from "./jwt.service";

@Injectable()
export class JwtGuard implements GuardContract {
	constructor(private readonly jwt: JwtService) {}

	async canActivate(ctx: RequestContext): Promise<boolean> {
		const header = ctx.headers.get("authorization") ?? "";
		const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
		if (!token) throw new UnauthorizedException("Missing bearer token.");

		const payload = await this.jwt.verify(token);
		if (!payload) throw new UnauthorizedException("Invalid or expired token.");

		ctx.state.jwt = payload;
		return true;
	}
}
