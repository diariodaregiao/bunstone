import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type { ZodType } from "zod/v4";
import { z } from "zod/v4";
import { Body, Param } from "@/http/params";
import { Controller, Delete, Get, Post } from "@/http/routing";
import { buildOpenApiDocument } from "@/openapi/builder";
import { swaggerUiHtml } from "@/openapi/ui";

const Unrepresentable = z.object({
	when: z.date(),
	big: z.bigint(),
	opaque: z.custom<unknown>(() => true),
	derived: z.string().transform((value) => value.length),
});

// Not a real schema, but it satisfies the duck-typed `isZodSchema` check, so it
// exercises the fallback for anything `z.toJSONSchema` refuses outright.
const Hostile = { parse: () => undefined } as unknown as ZodType;

@Controller("orgs/:orgId/users")
class NestedController {
	@Get(":id")
	one(@Param("orgId") orgId: string, @Param("id") id: string) {
		return { orgId, id };
	}

	@Delete()
	removeAll() {
		return null;
	}
}

@Controller("things")
class ThingsController {
	@Post()
	create(@Body(Unrepresentable) body: unknown) {
		return body;
	}
}

@Controller("things")
class HostileController {
	@Post("hostile")
	hostile(@Body(Hostile) body: unknown) {
		return body;
	}
}

const info = { title: "Hardening", version: "1.0.0" };

describe("OpenAPI path parameters", () => {
	it("documents params declared on the controller prefix", () => {
		const doc = buildOpenApiDocument([NestedController], info) as any;
		const operation = doc.paths["/orgs/{orgId}/users/{id}"].get;
		const names = operation.parameters.map((param: any) => param.name).sort();

		expect(names).toEqual(["id", "orgId"]);
		for (const param of operation.parameters) {
			expect(param.in).toBe("path");
			expect(param.required).toBe(true);
		}
	});

	it("documents prefix params on routes without their own params", () => {
		const doc = buildOpenApiDocument([NestedController], info) as any;
		const operation = doc.paths["/orgs/{orgId}/users"].delete;

		expect(operation.parameters).toContainEqual({
			name: "orgId",
			in: "path",
			required: true,
			schema: { type: "string" },
		});
	});
});

describe("OpenAPI schema conversion", () => {
	it("does not throw on zod types that have no JSON Schema form", () => {
		const doc = buildOpenApiDocument([ThingsController], info) as any;
		const schema =
			doc.paths["/things"].post.requestBody.content["application/json"].schema;

		expect(schema.type).toBe("object");
		expect(Object.keys(schema.properties).sort()).toEqual([
			"big",
			"derived",
			"opaque",
			"when",
		]);
	});

	it("degrades to a permissive schema and warns when conversion fails", () => {
		const warnings: unknown[][] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			warnings.push(args);
		};
		let doc: any;
		try {
			doc = buildOpenApiDocument([HostileController], info);
		} finally {
			console.log = originalLog;
		}

		const schema =
			doc.paths["/things/hostile"].post.requestBody.content["application/json"]
				.schema;
		expect(schema).toEqual({});
		expect(
			warnings.some((args) =>
				args.some(
					(arg) =>
						typeof arg === "string" && arg.includes("POST /things/hostile"),
				),
			),
		).toBe(true);
	});
});

describe("Swagger UI page", () => {
	it("pins the swagger-ui-dist version and locks it with SRI", () => {
		const html = swaggerUiHtml("/openapi.json");

		expect(html).toContain("swagger-ui-dist@5.32.11/swagger-ui-bundle.js");
		expect(html).toContain("swagger-ui-dist@5.32.11/swagger-ui.css");
		expect(html).not.toContain("swagger-ui-dist/swagger-ui");
		expect(html.match(/integrity="sha384-[^"]+"/g)).toHaveLength(2);
		expect(html.match(/crossorigin="anonymous"/g)).toHaveLength(2);
	});

	it("escapes the spec path so it cannot break out of the script block", () => {
		const html = swaggerUiHtml('/spec";</script><script>alert(1)//');

		expect(html).not.toContain("</script><script>alert(1)");
		expect(html).toContain("\\u003c/script>");
		expect(html.match(/<script/g)).toHaveLength(2);
	});
});
