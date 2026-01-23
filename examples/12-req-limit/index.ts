import {
    AppStartup,
    Body,
    Controller,
    Get,
    Module,
    Post,
    ReqLimit,
} from "../../index";

interface LoginDto {
	username: string;
	password: string;
}

@Controller("api")
class ApiController {
	/**
	 * Login endpoint with rate limiting
	 * Allows only 5 login attempts per minute from the same IP
	 */
	@ReqLimit({ ttl: 60000, limit: 5 })
	@Post("login")
	async login(@Body() body: LoginDto) {
		// Simulate login logic
		if (body.username === "admin" && body.password === "secret") {
			return {
				success: true,
				token: "fake-jwt-token",
			};
		}
		return {
			success: false,
			message: "Invalid credentials",
		};
	}

	/**
	 * API endpoint with rate limiting
	 * Allows 100 requests per minute
	 */
	@ReqLimit({ ttl: 60000, limit: 100 })
	@Get("data")
	async getData() {
		return {
			data: [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
				{ id: 3, name: "Item 3" },
			],
		};
	}

	/**
	 * Aggressive rate limiting for sensitive operations
	 * Allows only 3 requests per 10 seconds
	 */
	@ReqLimit({ ttl: 10000, limit: 3 })
	@Post("password-reset")
	async resetPassword(@Body() body: { email: string }) {
		return {
			message: `Password reset link sent to ${body.email}`,
		};
	}

	/**
	 * No rate limiting on public endpoint
	 */
	@Get("public")
	async getPublic() {
		return {
			message: "This endpoint has no rate limits",
		};
	}
}

@Module({
	controllers: [ApiController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000);

console.log(`
🚀 Server running on http://localhost:3000

Available endpoints:
- POST /api/login       - Rate limited: 5 requests/minute
- GET  /api/data        - Rate limited: 100 requests/minute
- POST /api/password-reset - Rate limited: 3 requests/10 seconds
- GET  /api/public      - No rate limit

Try testing with curl:
  curl -X POST http://localhost:3000/api/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"admin","password":"secret"}'
`);
