import "reflect-metadata";
import { z } from "zod/v4";
import {
	Application,
	Body,
	Controller,
	Get,
	Injectable,
	Module,
	Param,
	Post,
	Query,
} from "../index";

@Injectable()
class RepoService {
	find(id: string) {
		return { id, name: "Ada Lovelace", role: "admin" };
	}
}

@Injectable()
class UserService {
	constructor(private readonly repo: RepoService) {}
	get(id: string) {
		return this.repo.find(id);
	}
}

const CreateUser = z.object({ name: z.string().min(2), age: z.number() });

@Controller()
class BenchController {
	constructor(private readonly users: UserService) {}

	@Get("json")
	json() {
		return { hello: "world", n: 42, items: [1, 2, 3], ok: true };
	}

	@Get("param/:id")
	param(@Param("id") id: string) {
		return { id };
	}

	@Get("query")
	query(@Query("q") q?: string) {
		return { q: q ?? null };
	}

	@Get("di/:id")
	di(@Param("id") id: string) {
		return this.users.get(id);
	}

	@Post("validate")
	validate(@Body(CreateUser) body: z.infer<typeof CreateUser>) {
		return { created: body };
	}
}

@Module({
	controllers: [BenchController],
	providers: [RepoService, UserService],
})
class BenchModule {}

const app = await Application.create(BenchModule, {
	gracefulShutdown: false,
	logStartup: false,
});
app.listen(Number(process.env.BENCH_PORT ?? 3999));
console.log("ready");
