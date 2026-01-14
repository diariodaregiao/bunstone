import { AppStartup, Controller, Get, Module } from "../../../index";

@Controller()
class AppController {
	@Get("/")
	hello() {
		return { message: "Hello World" };
	}
}

@Module({
	controllers: [AppController],
})
class AppModule {}

async function bootstrap() {
	const app = await AppStartup.create(AppModule);
	app.listen(3000);
	console.log("bunstone server listening on port 3000");
}

bootstrap();
