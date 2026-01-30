import { describe, expect, test } from "bun:test";
import {
	AppStartup,
	Controller,
	Get,
	Jwt,
	JwtModule,
	Module,
	Request as Req,
} from "../index";

@Controller("auth")
class AuthController {
	@Get("protected")
	@Jwt()
	protected() {
		return "secret-data";
	}

	@Get("token")
	async sign(@Req() context: any) {
		if (!context.jwt) {
			console.log("Context keys in controller:", Object.keys(context));
		}
		return await context.jwt.sign({ sub: "123" });
	}
}

@Module({
	imports: [
		JwtModule.register({
			name: "jwt",
			secret: "test-secret",
		}),
	],
	controllers: [AuthController],
})
class AuthModule {}

describe("JWT Authentication", () => {
	test("should handle full JWT flow", async () => {
		const app = await AppStartup.create(AuthModule);
		const elysia = (app as any).getElysia();

		// 1. Get a token
		const tokenRes = await elysia.handle(
			new Request("http://localhost/auth/token"),
		);
		const token = await tokenRes.text();
		expect(token).toBeDefined();
		expect(token.length).toBeGreaterThan(10);

		// 2. Access protected route without token
		const resNoToken = await elysia.handle(
			new Request("http://localhost/auth/protected"),
		);
		expect(resNoToken.status).toBe(500); // Unauthorized throws error

		// 3. Access protected route with valid token
		const resValidToken = await elysia.handle(
			new Request("http://localhost/auth/protected", {
				headers: { authorization: `Bearer ${token}` },
			}),
		);
		if (resValidToken.status === 500) {
			console.log("Error response:", await resValidToken.text());
		}
		expect(resValidToken.status).toBe(200);
		expect(await resValidToken.text()).toBe("secret-data");

		// 4. Access protected route with invalid token
		const resInvalidToken = await elysia.handle(
			new Request("http://localhost/auth/protected", {
				headers: { authorization: "Bearer invalid-token" },
			}),
		);
		expect(resInvalidToken.status).toBe(500);
	});
});
