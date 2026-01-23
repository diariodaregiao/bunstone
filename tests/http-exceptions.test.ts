import { describe, expect, test } from "bun:test";
import {
	AppStartup,
	BadRequestException,
	Controller,
	CreatedResponse,
	ForbiddenException,
	Get,
	InternalServerErrorException,
	Module,
	NoContentResponse,
	NotFoundException,
	UnauthorizedException,
} from "../index";

describe("HTTP Exceptions", () => {
	@Controller("exceptions")
	class ExceptionsController {
		@Get("not-found")
		throwNotFound() {
			throw new NotFoundException("Custom not found message");
		}

		@Get("bad-request")
		throwBadRequest() {
			throw new BadRequestException({ error: "bad", code: 123 });
		}

		@Get("unauthorized")
		throwUnauthorized() {
			throw new UnauthorizedException();
		}

		@Get("forbidden")
		throwForbidden() {
			throw new ForbiddenException();
		}

		@Get("internal")
		throwInternal() {
			throw new InternalServerErrorException();
		}

		@Get("created")
		throwCreated() {
			throw new CreatedResponse({ id: 1 });
		}

		@Get("no-content")
		throwNoContent() {
			throw new NoContentResponse();
		}
	}

	@Module({
		controllers: [ExceptionsController],
	})
	class ExceptionsModule {}

	test("should handle NotFoundException", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/not-found"),
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			message: "Custom not found message",
		});
	});

	test("should handle BadRequestException with object", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/bad-request"),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "bad", code: 123 });
	});

	test("should handle UnauthorizedException", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/unauthorized"),
		);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ message: "Unauthorized" });
	});

	test("should handle ForbiddenException", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/forbidden"),
		);
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ message: "Forbidden" });
	});

	test("should handle InternalServerErrorException", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/internal"),
		);
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: "Internal Server Error" });
	});

	test("should handle CreatedResponse", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/created"),
		);
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ id: 1 });
	});

	test("should handle NoContentResponse", async () => {
		const app = await AppStartup.create(ExceptionsModule);
		const elysia = (app as any).getElysia();
		const response = await elysia.handle(
			new Request("http://localhost/exceptions/no-content"),
		);
		expect(response.status).toBe(204);
	});
});
