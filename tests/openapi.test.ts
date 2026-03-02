import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	ApiOperation,
	ApiResponse,
	ApiTags,
	AppStartup,
	Controller,
	Get,
	Module,
} from "../index";

const ResponseSchema = z.object({
	message: z.string(),
});

@ApiTags("TestTag")
@Controller("openapi")
class OpenApiController {
	@Get("hello")
	@ApiOperation({
		summary: "Hello World",
		description: "Returns a hello message",
	})
	@ApiResponse({ status: 200, description: "Success", type: ResponseSchema })
	hello() {
		return { message: "hello" };
	}
}

@Module({
	controllers: [OpenApiController],
})
class OpenApiTestModule {}

describe("OpenAPI Documentation", () => {
	test("should generate correct swagger json metadata", async () => {
		const app = await AppStartup.create(OpenApiTestModule, {
			swagger: {
				path: "/swagger",
			},
		});
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(
			new Request("http://localhost/swagger/json"),
		);
		expect(response.status).toBe(200);

		const swagger = await response.json();

		// Check tags
		expect(swagger.paths["/openapi/hello"].get.tags).toContain("TestTag");

		// Check summary and description
		expect(swagger.paths["/openapi/hello"].get.summary).toBe("Hello World");
		expect(swagger.paths["/openapi/hello"].get.description).toBe(
			"Returns a hello message",
		);

		// Check responses
		expect(swagger.paths["/openapi/hello"].get.responses["200"]).toBeDefined();
		expect(
			swagger.paths["/openapi/hello"].get.responses["200"].description,
		).toBe("Success");

		// Check if schema is present (elysia-swagger should have converted zod to json schema)
		expect(
			swagger.paths["/openapi/hello"].get.responses["200"].content[
				"application/json"
			].schema,
		).toBeDefined();
	});
});

describe("OpenAPI Basic Auth", () => {
	test("should return 401 when accessing swagger without credentials", async () => {
		const app = await AppStartup.create(OpenApiTestModule, {
			swagger: {
				path: "/docs",
				auth: {
					username: "admin",
					password: "secret",
				},
			},
		});
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(new Request("http://localhost/docs"));
		expect(response.status).toBe(401);
		expect(response.headers.get("WWW-Authenticate")).toBe(
			'Basic realm="Swagger Documentation"',
		);
	});

	test("should return 401 when accessing swagger with wrong credentials", async () => {
		const app = await AppStartup.create(OpenApiTestModule, {
			swagger: {
				path: "/docs",
				auth: {
					username: "admin",
					password: "secret",
				},
			},
		});
		const elysia = (app as any).getElysia();

		const wrongToken = Buffer.from("admin:wrong").toString("base64");
		const response = await elysia.handle(
			new Request("http://localhost/docs", {
				headers: { Authorization: `Basic ${wrongToken}` },
			}),
		);
		expect(response.status).toBe(401);
	});

	test("should allow access with correct credentials", async () => {
		const app = await AppStartup.create(OpenApiTestModule, {
			swagger: {
				path: "/docs",
				auth: {
					username: "admin",
					password: "secret",
				},
			},
		});
		const elysia = (app as any).getElysia();

		const validToken = Buffer.from("admin:secret").toString("base64");
		const response = await elysia.handle(
			new Request("http://localhost/docs/json", {
				headers: { Authorization: `Basic ${validToken}` },
			}),
		);
		expect(response.status).toBe(200);
	});

	test("should not require auth when auth option is not set", async () => {
		const app = await AppStartup.create(OpenApiTestModule, {
			swagger: {
				path: "/swagger",
			},
		});
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(
			new Request("http://localhost/swagger/json"),
		);
		expect(response.status).toBe(200);
	});
});
