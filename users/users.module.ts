import { Module } from "../index.ts";
import { AuthGuard } from "./auth.guard.ts";
import { UsersController } from "./users.controller.ts";

@Module({
	controllers: [UsersController],
	providers: [AuthGuard],
})
export class UsersModule {}
