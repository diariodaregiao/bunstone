/**
 * A minimal app, run by decorator-mode.test.ts from a directory without a
 * tsconfig.json: Bun then compiles its decorators as standard (TC39) ones.
 */
import "reflect-metadata";
import {
	Application,
	Controller,
	Get,
	Injectable,
	Module,
	Param,
} from "../../../index";

@Injectable()
class Greeter {
	greet(name: string) {
		return `hi ${name}`;
	}
}

@Controller("users")
class UsersController {
	constructor(private readonly greeter: Greeter) {}

	@Get(":id")
	find(@Param("id") id: string) {
		return { text: this.greeter.greet(id) };
	}
}

@Module({ controllers: [UsersController], providers: [Greeter] })
class AppModule {}

const app = await Application.create(AppModule, {
	logStartup: false,
	gracefulShutdown: false,
});
app.listen(0);
const res = await fetch(`${app.getServer()!.url}users/7`);
console.log("STATUS", res.status, await res.text());
await app.close();
