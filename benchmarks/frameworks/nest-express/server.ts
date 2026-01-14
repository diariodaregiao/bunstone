import { NestFactory } from "@nestjs/core";
import { Controller, Get, Module } from "@nestjs/common";

@Controller()
class AppController {
	@Get("/")
	getHello() {
		return { message: "Hello World" };
	}
}

@Module({
	controllers: [AppController],
})
class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { logger: false });
	await app.listen(3000);
}

bootstrap();
