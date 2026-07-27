import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Jwt } from "@/auth/jwt.decorators";
import { JwtModule } from "@/auth/jwt-module";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { Cors } from "@/http/cors";
import { type GuardContract, UseGuards } from "@/http/guard";
import { Controller, Get, Options } from "@/http/routing";

@Injectable()
class AllowGuard implements GuardContract {
	canActivate(): boolean {
		return true;
	}
}

@Injectable()
class DenyGuard implements GuardContract {
	static calls = 0;
	canActivate(): boolean {
		DenyGuard.calls++;
		return false;
	}
}

// two class-level guard decorators on one controller must both survive
@UseGuards(AllowGuard)
@Jwt()
@Controller("admin")
class AdminController {
	@Get("secret")
	secret() {
		return { secret: 42 };
	}
}

// a subclass inherits its route prefix, so it must inherit the guard too
@UseGuards(DenyGuard)
@Controller("base")
class GuardedBase {}

class InheritingController extends GuardedBase {
	@Get("child")
	child() {
		return { child: true };
	}
}

@Controller("t")
class MethodsController {
	@Get("me")
	me() {
		return { ok: true };
	}

	@Options("opt")
	custom() {
		return { custom: true };
	}

	@Get("opt")
	optGet() {
		return { get: true };
	}
}

@Module({
	imports: [JwtModule.register({ secret: "s3cret" })],
	controllers: [AdminController, InheritingController, MethodsController],
	providers: [AllowGuard, DenyGuard],
})
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
		cors: { credentials: true, origin: ["http://client.test"] },
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("guard composition", () => {
	it("keeps every class-level guard when decorators are stacked", async () => {
		const res = await fetch(`${base}/admin/secret`);
		expect(res.status).toBe(401);
	});

	it("applies an inherited class guard to a subclass controller", async () => {
		DenyGuard.calls = 0;
		const res = await fetch(`${base}/base/child`);

		expect(res.status).toBe(403);
		expect(DenyGuard.calls).toBe(1);
	});
});

describe("method handling", () => {
	it("serves HEAD wherever GET is served, without a body", async () => {
		const res = await fetch(`${base}/t/me`, { method: "HEAD" });

		expect(res.status).toBe(200);
		expect(await res.text()).toBe("");
	});

	it("answers 405 with Allow for a known path and unknown method", async () => {
		const res = await fetch(`${base}/t/me`, { method: "POST" });

		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toContain("GET");
		expect(await res.json()).toEqual({
			statusCode: 405,
			message: "Method Not Allowed",
		});
	});

	it("still answers 404 for an unknown path", async () => {
		expect((await fetch(`${base}/t/nothing-here`)).status).toBe(404);
	});

	it("answers the CORS preflight even when the route defines OPTIONS", async () => {
		const res = await fetch(`${base}/t/opt`, {
			method: "OPTIONS",
			headers: {
				Origin: "http://client.test",
				"Access-Control-Request-Method": "GET",
			},
		});

		expect(res.status).toBe(204);
		expect(res.headers.get("access-control-allow-methods")).toContain("GET");
	});

	it("still routes a non-preflight OPTIONS to the handler", async () => {
		const res = await fetch(`${base}/t/opt`, { method: "OPTIONS" });
		expect(await res.json()).toEqual({ custom: true });
	});
});

describe("CORS with credentials", () => {
	it("allows a listed origin and sends the credentials header", async () => {
		const res = await fetch(`${base}/t/me`, {
			headers: { Origin: "http://client.test" },
		});

		expect(res.headers.get("access-control-allow-origin")).toBe(
			"http://client.test",
		);
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
		expect(res.headers.get("vary")).toBe("Origin");
	});

	it("never reflects an unlisted origin", async () => {
		const res = await fetch(`${base}/t/me`, {
			headers: { Origin: "https://evil.example" },
		});

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
		expect(res.headers.get("access-control-allow-credentials")).toBeNull();
	});

	it("refuses credentials paired with a wildcard origin at startup", () => {
		expect(() => new Cors({ credentials: true })).toThrow(/allowlist/);
		expect(() => new Cors({ credentials: true, origin: "*" })).toThrow();
		expect(() => new Cors({ credentials: true, origin: true })).toThrow();
	});
});
