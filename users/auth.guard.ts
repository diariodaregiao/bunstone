import {
	Injectable,
	UnauthorizedException,
	type GuardContract,
	type RequestContext,
} from "../index.ts";

const TOKEN = "teste";

@Injectable()
export class AuthGuard implements GuardContract {
	canActivate(ctx: RequestContext): boolean {
		const header = ctx.headers.get("authorization");
		if (!header?.startsWith("Bearer ")) {
			throw new UnauthorizedException("Token ausente ou inválido");
		}

		const token = header.slice("Bearer ".length).trim();
		if (token !== TOKEN) {
			throw new UnauthorizedException("Token ausente ou inválido");
		}

		return true;
	}
}
