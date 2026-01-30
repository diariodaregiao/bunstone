import { describe, expect, test } from "bun:test";
import {
	AppStartup,
	Controller,
	Get,
	Guard,
	Injectable,
	Module,
} from "../index";
import { GuardContract } from "../lib/interfaces/guard-contract";

class AsyncGuard implements GuardContract {
	async validate(context: any): Promise<boolean> {
		await new Promise((resolve) => setTimeout(resolve, 10));
		const auth = context.headers.authorization;
		return auth === "Bearer async-token";
	}
}

@Injectable()
class GuardService {
	check() {
		return true;
	}
}

@Injectable()
class InjectedGuard implements GuardContract {
	constructor(private service: GuardService) {}
	validate(): boolean {
		return !!this.service && this.service.check();
	}
}

@Controller("guards")
class GuardController {
	@Get("async")
	@Guard(AsyncGuard)
	asyncGuard() {
		return "async-ok";
	}

	@Get("injected")
	@Guard(InjectedGuard)
	injectedGuard() {
		return "injected-ok";
	}
}

@Module({
	controllers: [GuardController],
	providers: [GuardService],
})
class GuardTestModule {}

describe("Guards Integration", () => {
	test("should handle Async Guard", async () => {
		const app = await AppStartup.create(GuardTestModule);
		const elysia = (app as any).getElysia();

		// Unauthorized
		const res1 = await elysia.handle(
			new Request("http://localhost/guards/async"),
		);
		expect(res1.status).toBe(500); // AppStartup throws Error("Unauthorized") which results in 500 by default if not handled differently

		// Authorized
		const res2 = await elysia.handle(
			new Request("http://localhost/guards/async", {
				headers: { authorization: "Bearer async-token" },
			}),
		);
		expect(res2.status).toBe(200);
		expect(await res2.text()).toBe("async-ok");
	});

	test("should handle Injected Guard", async () => {
		const app = await AppStartup.create(GuardTestModule);
		const elysia = (app as any).getElysia();

		const res = await elysia.handle(
			new Request("http://localhost/guards/injected"),
		);
		// This will likely fail or throw error if DI is not working for guards
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("injected-ok");
	});
});
