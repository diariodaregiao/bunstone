import "reflect-metadata";
import { afterAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { ResponseValidationError } from "@/errors";
import { Returns } from "@/http/returns";
import { Controller, Get, Post } from "@/http/routing";
import { buildOpenApiDocument } from "@/openapi/builder";
import { Test } from "@/testing";

const User = z.object({
	id: z.string(),
	name: z.string(),
	role: z.enum(["admin", "user"]).default("user"),
});

@Controller("users")
class UsersController {
	@Get("strip")
	@Returns(User, { example: { id: "1", name: "Ada", role: "admin" } })
	strip() {
		return { id: "1", name: "Ada", password: "secret" };
	}

	@Get("async")
	@Returns(z.array(User))
	async list() {
		return [{ id: "1", name: "Ada", role: "admin" as const }];
	}

	@Post()
	@Returns(User, { status: 201, description: "Created" })
	create() {
		return { id: "2", name: "Linus" };
	}

	@Get("broken")
	@Returns(User)
	broken() {
		return { id: 1, name: "Ada" } as unknown as z.input<typeof User>;
	}

	@Get("raw")
	@Returns(User, { parse: false })
	raw() {
		return {
			id: "1",
			name: "Ada",
			role: "user" as const,
			password: "leaks",
		};
	}

	@Get("response")
	@Returns(User)
	passthrough() {
		return new Response("custom") as unknown as z.input<typeof User>;
	}
}

// Compile-time contract: each of these must be rejected by `tsc`.
@Controller("typing")
class TypingController {
	// @ts-expect-error a field of the wrong type
	@Returns(User)
	wrongType() {
		return { id: 1, name: "Ada" };
	}

	// @ts-expect-error a required field is missing
	@Returns(User)
	missing() {
		return { id: "1" };
	}

	// @ts-expect-error with parse: false the handler must return the output, defaults included
	@Returns(User, { parse: false })
	noDefaults() {
		return { id: "1", name: "Ada" };
	}

	annotated(): z.input<typeof User> {
		return { id: "1", name: "Ada", role: "admin" };
	}

	@Returns(User, {
		// @ts-expect-error the example is checked against the schema
		example: { id: 1, name: "Ada", role: "admin" },
	})
	badExample() {
		return { id: "1", name: "Ada", role: "admin" as const };
	}
}
void TypingController;

const moduleRef = await Test.createTestingModule({
	controllers: [UsersController],
}).compile();
const app = moduleRef.createTestApp();

afterAll(async () => {
	await moduleRef.close();
});

describe("@Returns at runtime", () => {
	it("strips keys the schema does not declare and applies defaults", async () => {
		const res = await app.get("/users/strip");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: "1", name: "Ada", role: "user" });
	});

	it("parses the resolved value of an async handler", async () => {
		const res = await app.get("/users/async");
		expect(await res.json()).toEqual([{ id: "1", name: "Ada", role: "admin" }]);
	});

	it("responds with the declared status", async () => {
		const res = await app.post("/users", {});
		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ id: "2", name: "Linus", role: "user" });
	});

	it("turns a value the schema rejects into a 500, not a 400", async () => {
		const res = await app.get("/users/broken");
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({
			statusCode: 500,
			message: "Internal Server Error",
		});
	});

	it("sends the value untouched with parse: false", async () => {
		const res = await app.get("/users/raw");
		expect(await res.json()).toEqual({
			id: "1",
			name: "Ada",
			role: "user",
			password: "leaks",
		});
	});

	it("lets a Response through unparsed", async () => {
		const res = await app.get("/users/response");
		expect(await res.text()).toBe("custom");
	});

	it("reports a mismatch with a typed error carrying the Zod issues", () => {
		const error = ResponseValidationError.mismatch(
			"GET /users/broken",
			new Error("zod"),
		);
		expect(error.code).toBe("BNS-HTTP-003");
		expect(error.context).toEqual({ route: "GET /users/broken" });
	});
});

describe("@Returns in OpenAPI", () => {
	const doc = buildOpenApiDocument([UsersController], {
		title: "Returns",
		version: "1.0.0",
	}) as any;

	it("documents the schema's output under 200 by default", () => {
		const ok = doc.paths["/users/strip"].get.responses["200"];
		expect(ok.description).toBe("Successful response");
		const media = ok.content["application/json"];
		expect(media.schema.required).toEqual(["id", "name", "role"]);
		expect(media.example).toEqual({ id: "1", name: "Ada", role: "admin" });
	});

	it("documents under the declared status and description", () => {
		const responses = doc.paths["/users"].post.responses;
		expect(Object.keys(responses)).toEqual(["201"]);
		expect(responses["201"].description).toBe("Created");
		expect(responses["201"].content["application/json"].schema.type).toBe(
			"object",
		);
	});

	it("documents arrays", () => {
		const schema =
			doc.paths["/users/async"].get.responses["200"].content["application/json"]
				.schema;
		expect(schema.type).toBe("array");
	});
});
