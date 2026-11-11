import "reflect-metadata";
import { Application, Controller, Get, Module } from "@grupodiariodaregiao/bunstone";

@Controller()
class AppController {
	@Get()
	hello() {
		return { message: "Hello from Bunstone!" };
	}
}

@Module({ controllers: [AppController] })
class AppModule {}

const app = await Application.create(AppModule, { logStartup: false, gracefulShutdown: false });
const booted = performance.now();
app.listen(0);
const res = await fetch(app.getServer()!.url);
const body = await res.json();
await app.close();
console.log(JSON.stringify({ ok: res.status === 200 && body.message === "Hello from Bunstone!", booted, rss: process.memoryUsage().rss }));
