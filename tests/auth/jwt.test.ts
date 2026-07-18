import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Jwt, JwtModule, JwtPayload, JwtService } from "@/auth";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get } from "@/http/routing";

@Controller("me")
class MeController {
	@Get()
	@Jwt()
	profile(@JwtPayload() payload: { sub: string }) {
		return { sub: payload.sub };
	}
}

@Module({
	imports: [JwtModule.register({ secret: "test-secret", expiresIn: "1h" })],
	controllers: [MeController],
})
class AppModule {}

let app: Application;
let base: string;
let jwt: JwtService;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
	jwt = app.resolve(JwtService);
});

afterAll(async () => {
	await app.close();
});

describe("JwtService", () => {
	it("signs and verifies a token", async () => {
		const token = await jwt.sign({ sub: "user-1", role: "admin" });
		const payload = await jwt.verify<{ sub: string; role: string }>(token);
		expect(payload?.sub).toBe("user-1");
		expect(payload?.role).toBe("admin");
	});

	it("returns null for a tampered token", async () => {
		const token = await jwt.sign({ sub: "user-1" });
		expect(await jwt.verify(`${token}x`)).toBeNull();
	});

	it("rejects a token signed with a different secret", async () => {
		const other = new JwtService({ secret: "other-secret" });
		const foreign = await other.sign({ sub: "intruder" });
		expect(await jwt.verify(foreign)).toBeNull();
	});
});

describe("@Jwt guard", () => {
	it("rejects requests without a token", async () => {
		const res = await fetch(`${base}/me`);
		expect(res.status).toBe(401);
	});

	it("rejects an invalid token", async () => {
		const res = await fetch(`${base}/me`, {
			headers: { authorization: "Bearer garbage" },
		});
		expect(res.status).toBe(401);
	});

	it("allows a valid token and exposes the payload", async () => {
		const token = await jwt.sign({ sub: "user-42" });
		const res = await fetch(`${base}/me`, {
			headers: { authorization: `Bearer ${token}` },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ sub: "user-42" });
	});
});
