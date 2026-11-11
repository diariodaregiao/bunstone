import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Param } from "@/http/params";
import { Controller, Delete, Get } from "@/http/routing";
import { buildOpenApiDocument } from "@/openapi/builder";
import { ApiResponse } from "@/openapi/decorators";

const User = z.object({
	id: z.string(),
	name: z.string(),
	role: z.enum(["admin", "user"]).default("user"),
});

interface Category {
	name: string;
	children: Category[];
}

const Category: z.ZodType<Category> = z.object({
	name: z.string(),
	get children() {
		return z.array(Category);
	},
});

@Controller("users")
class UsersController {
	@Get(":id")
	@ApiResponse({
		status: 200,
		description: "found",
		schema: User,
		example: { id: "1", name: "Ada", role: "admin" },
	})
	@ApiResponse({
		status: 404,
		description: "missing",
		schema: { type: "object", properties: { message: { type: "string" } } },
		examples: {
			notFound: {
				summary: "Unknown id",
				value: { message: "User not found" },
			},
		},
	})
	one(@Param("id") id: string) {
		return { id };
	}

	@Get()
	@ApiResponse({ status: 200, schema: z.array(User) })
	list() {
		return [];
	}

	@Get("export")
	@ApiResponse({
		status: 200,
		contentType: "text/csv",
		schema: { type: "string" },
		example: "id,name\n1,Ada",
	})
	exportCsv() {
		return "id,name\n1,Ada";
	}

	@Get("example-only")
	@ApiResponse({ status: 200, example: { ok: true } })
	exampleOnly() {
		return { ok: true };
	}

	@Delete(":id")
	@ApiResponse({ status: 204, description: "deleted" })
	remove() {}

	@Get("tree")
	@ApiResponse({ status: 200, schema: Category })
	tree() {
		return [];
	}
}

const doc = buildOpenApiDocument([UsersController], {
	title: "Responses",
	version: "1.0.0",
}) as any;

describe("OpenAPI response payloads", () => {
	it("documents a Zod response schema with its example", () => {
		const ok = doc.paths["/users/{id}"].get.responses["200"];
		expect(ok.description).toBe("found");

		const media = ok.content["application/json"];
		expect(media.schema.type).toBe("object");
		expect(media.schema.properties.name).toEqual({ type: "string" });
		expect(media.example).toEqual({ id: "1", name: "Ada", role: "admin" });
	});

	it("uses the output side of the schema, so defaulted fields are required", () => {
		const schema =
			doc.paths["/users/{id}"].get.responses["200"].content["application/json"]
				.schema;
		expect(schema.required).toContain("role");
	});

	it("passes a plain JSON Schema and named examples through verbatim", () => {
		const missing = doc.paths["/users/{id}"].get.responses["404"];
		expect(missing.content["application/json"]).toEqual({
			schema: { type: "object", properties: { message: { type: "string" } } },
			examples: {
				notFound: {
					summary: "Unknown id",
					value: { message: "User not found" },
				},
			},
		});
	});

	it("documents array responses", () => {
		const schema =
			doc.paths["/users"].get.responses["200"].content["application/json"]
				.schema;
		expect(schema.type).toBe("array");
		expect(schema.items.properties.id).toEqual({ type: "string" });
	});

	it("honours a custom content type", () => {
		const content = doc.paths["/users/export"].get.responses["200"].content;
		expect(Object.keys(content)).toEqual(["text/csv"]);
		expect(content["text/csv"].example).toBe("id,name\n1,Ada");
	});

	it("accepts an example without a schema", () => {
		const content =
			doc.paths["/users/example-only"].get.responses["200"].content;
		expect(content).toEqual({ "application/json": { example: { ok: true } } });
	});

	it("leaves a response without schema or example body-less", () => {
		expect(doc.paths["/users/{id}"].delete.responses["204"]).toEqual({
			description: "deleted",
		});
	});

	it("hoists a self-referencing response schema into components", () => {
		const schema =
			doc.paths["/users/tree"].get.responses["200"].content["application/json"]
				.schema;
		const name = "UsersControllerTreeResponse200";
		expect(schema).toEqual({ $ref: `#/components/schemas/${name}` });
		expect(JSON.stringify(doc.components.schemas[name])).toContain(
			`"$ref":"#/components/schemas/${name}"`,
		);
	});
});
