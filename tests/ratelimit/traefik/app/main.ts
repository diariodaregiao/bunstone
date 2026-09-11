import "reflect-metadata";
import {
	Application,
	Controller,
	Get,
	Module,
	RateLimitModule,
} from "../../../../../index.ts";

const useRedis = process.env.USE_REDIS === "true";
const trustProxy = process.env.TRUST_PROXY === "true";
const max = Number(process.env.RATE_LIMIT_MAX ?? "5");

@Controller("api")
class ApiController {
	@Get("limited")
	limited() {
		return { ok: true };
	}
}

@Module({
	imports: useRedis
		? [
				RateLimitModule.registerStorage({
					url: process.env.REDIS_URL ?? "redis://redis:6379",
					keyPrefix: process.env.REDIS_KEY_PREFIX ?? "bunstone:traefik:",
				}),
			]
		: [],
	controllers: [ApiController],
})
class AppModule {}

const app = await Application.create(AppModule, {
	gracefulShutdown: false,
	logStartup: false,
	health: true,
	rateLimit: { max, windowMs: 60_000, message: "slow down" },
	trustProxy,
});

app.listen(Number(process.env.PORT ?? "3000"));
