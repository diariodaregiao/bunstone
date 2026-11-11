/**
 * Many features at once, so a production bundle that drops something it
 * should not (a decorator's metadata, a module's wiring) fails here.
 */
import "reflect-metadata";
import { z } from "zod";
import {
	AggregateRoot,
	Application,
	ApiTags,
	Body,
	Controller,
	Cron,
	EVENT_STORE,
	EventSourcedRepository,
	type EventStore,
	Get,
	Inject,
	Injectable,
	InjectionToken,
	Jwt,
	JwtModule,
	JwtPayload,
	JwtService,
	Module,
	Param,
	Post,
	RateLimit,
	Returns,
	SqlEventStoreModule,
	SqlModule,
	TelemetryModule,
	UseGuards,
	type GuardContract,
	type RequestContext,
} from "@grupodiariodaregiao/bunstone";

const GREETING = new InjectionToken<string>("Greeting");

class Counter extends AggregateRoot {
	count = 0;
	bump() {
		this.apply({ type: "Bumped" });
	}
	protected when(event: object) {
		if ((event as { type: string }).type === "Bumped") this.count++;
	}
}

@Injectable()
class Jobs {
	ticks = 0;
	@Cron("0 0 1 1 *")
	yearly() {
		this.ticks++;
	}
}

@Injectable()
class HeaderGuard implements GuardContract {
	canActivate(ctx: RequestContext) {
		return ctx.headers.get("x-ok") === "1";
	}
}

const Item = z.object({ name: z.string().min(2) });

@ApiTags("kitchen")
@Controller("k")
class KitchenController {
	constructor(
		@Inject(GREETING) private readonly greeting: string,
		@Inject(EVENT_STORE) private readonly store: EventStore,
		private readonly jwt: JwtService,
	) {}

	@Get("hello/:name")
	@Returns(z.object({ text: z.string() }))
	hello(@Param("name") name: string) {
		return { text: `${this.greeting} ${name}`, secret: "stripped" };
	}

	@Post("items")
	@RateLimit({ max: 5, windowMs: 60_000 })
	create(@Body(Item) item: z.infer<typeof Item>) {
		return { created: item.name };
	}

	@Get("guarded")
	@UseGuards(HeaderGuard)
	guarded() {
		return { ok: true };
	}

	@Get("token")
	token() {
		return this.jwt.sign({ sub: "ada" });
	}

	@Get("me")
	@Jwt()
	me(@JwtPayload() payload: { sub: string }) {
		return { sub: payload.sub };
	}

	@Post("counter")
	async counter() {
		const repo = new EventSourcedRepository(this.store, () => new Counter());
		const counter = new Counter();
		counter.bump();
		counter.bump();
		await repo.save("c-1", counter);
		return { count: (await repo.load("c-1"))?.count };
	}
}

@Module({
	imports: [
		SqlModule.register({ adapter: "sqlite", filename: ":memory:" }),
		SqlEventStoreModule.register(),
		JwtModule.register({ secret: "kitchen-secret" }),
		TelemetryModule.register({ serviceName: "kitchen", traces: false, metrics: false }),
	],
	controllers: [KitchenController],
	providers: [{ provide: GREETING, useValue: "hi" }, Jobs, HeaderGuard],
})
class AppModule {}

const app = await Application.create(AppModule, {
	logStartup: false,
	gracefulShutdown: false,
	openapi: { info: { title: "kitchen", version: "1" } },
});
const booted = performance.now();
app.listen(0);
const base = app.getServer()!.url.href;
const get = (path: string, headers: Record<string, string> = {}) => fetch(base + path, { headers });
const post = (path: string, body?: unknown) =>
	fetch(base + path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});

const checks: Record<string, boolean> = {};
checks.di = (await (await get("k/hello/ada")).json()).text === "hi ada";
checks.returns = !("secret" in (await (await get("k/hello/ada")).json()));
checks.validation = (await post("k/items", { name: "x" })).status === 400;
checks.body = (await (await post("k/items", { name: "pan" })).json()).created === "pan";
checks.guardDenies = (await get("k/guarded")).status === 403;
checks.guardAllows = (await get("k/guarded", { "x-ok": "1" })).status === 200;
const token = await (await get("k/token")).text();
checks.jwt = (await (await get("k/me", { authorization: `Bearer ${token}` })).json()).sub === "ada";
checks.jwtDenies = (await get("k/me")).status === 401;
checks.eventStore = (await (await post("k/counter")).json()).count === 2;
const doc = await (await get("openapi.json")).json();
checks.openapi = Boolean(doc.paths["/k/hello/{name}"]?.get);
checks.rateLimitHeaders = (await post("k/items", { name: "pot" })).headers.has("x-ratelimit-limit");
checks.notFound = (await get("nope")).status === 404;
await app.close();

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length > 0) console.error(`kitchen checks failed: ${failed.join(", ")}`);
console.log(JSON.stringify({ ok: failed.length === 0, booted, rss: process.memoryUsage().rss }));
