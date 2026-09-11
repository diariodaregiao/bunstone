import type { z } from "zod/v4";
import {
	Body,
	Controller,
	Ctx,
	Delete,
	Get,
	Logger,
	NotFoundException,
	Param,
	Post,
	Put,
	type RequestContext,
	UseGuards,
} from "../index.ts";
import { AuthGuard } from "./auth.guard.ts";
import {
	CreateUser,
	UpdateUser,
	UserIdParam,
	type User,
} from "./user.schemas.ts";

@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {
	private readonly logger = new Logger("UsersController");
	private readonly users = new Map<string, User>();

	@Post()
	create(
		@Body(CreateUser) body: z.infer<typeof CreateUser>,
		@Ctx() ctx: RequestContext,
	) {
		this.logRequest(ctx, { body });

		const user: User = { id: crypto.randomUUID(), ...body };
		this.users.set(user.id, user);
		return user;
	}

	@Get(":id")
	findOne(
		@Param(UserIdParam) { id }: z.infer<typeof UserIdParam>,
		@Ctx() ctx: RequestContext,
	) {
		this.logRequest(ctx, { params: { id } });

		const user = this.users.get(id);
		if (!user) throw new NotFoundException("Usuário não encontrado");
		return user;
	}

	@Put(":id")
	update(
		@Param(UserIdParam) { id }: z.infer<typeof UserIdParam>,
		@Body(UpdateUser) body: z.infer<typeof UpdateUser>,
		@Ctx() ctx: RequestContext,
	) {
		this.logRequest(ctx, { params: { id }, body });

		const user = this.users.get(id);
		if (!user) throw new NotFoundException("Usuário não encontrado");

		const updated: User = { ...user, ...body };
		this.users.set(id, updated);
		return updated;
	}

	@Delete(":id")
	remove(
		@Param(UserIdParam) { id }: z.infer<typeof UserIdParam>,
		@Ctx() ctx: RequestContext,
	) {
		this.logRequest(ctx, { params: { id } });

		if (!this.users.has(id)) {
			throw new NotFoundException("Usuário não encontrado");
		}

		this.users.delete(id);
		return { deleted: true };
	}

	private logRequest(
		ctx: RequestContext,
		payload: Record<string, unknown>,
	): void {
		this.logger.info("request", {
			method: ctx.req.method,
			path: ctx.url.pathname,
			...payload,
		});
	}
}
