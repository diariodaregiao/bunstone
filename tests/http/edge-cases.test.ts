import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { RouteMatcher } from "@/http/matcher";
import { Body } from "@/http/params";
import { Controller, Post } from "@/http/routing";
import { buildOpenApiDocument } from "@/openapi/builder";

@Controller("noop")
class NoopController {
	@Post()
	create() {
		return { ok: true };
	}
}

@Module({ controllers: [NoopController] })
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
		static: { dir: "./docs", prefix: "/public" },
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("static files", () => {
	it("answers 400 for a malformed percent-escape instead of crashing", async () => {
		const res = await fetch(`${base}/public/%zz`);
		expect(res.status).toBe(400);
	});

	it("still serves a real file", async () => {
		const res = await fetch(`${base}/public/index.md`);
		expect(res.status).toBe(200);
	});
});

/** Digs the POST request-body schema out of a generated document. */
function bodySchema(
	document: Record<string, unknown>,
	path: string,
): Record<string, string | undefined> {
	const paths = document.paths as Record<string, Record<string, unknown>>;
	const post = paths[path]?.post as {
		requestBody: { content: Record<string, { schema: unknown }> };
	};
	return post.requestBody.content["application/json"]?.schema as Record<
		string,
		string | undefined
	>;
}

describe("recursive request schemas", () => {
	it("hoists a self-referencing schema so its $ref resolves", () => {
		const Category: z.ZodType = z.lazy(() =>
			z.object({ name: z.string(), children: z.array(Category) }),
		);

		@Controller("cat")
		class CatController {
			@Post()
			create(@Body(Category as never) body: unknown) {
				return body;
			}
		}

		const doc = buildOpenApiDocument([CatController], {
			title: "T",
			version: "1",
		});

		const schema = bodySchema(doc, "/cat");
		const components = (doc.components as { schemas: Record<string, unknown> })
			.schemas;

		// `#` alone would resolve to the root of the OpenAPI document
		expect(schema.$ref).toBe("#/components/schemas/CatControllerCreateBody");
		expect(Object.keys(components)).toContain("CatControllerCreateBody");
		expect(JSON.stringify(components)).not.toContain('"$ref":"#"');
	});

	it("leaves a plain schema inline", () => {
		@Controller("plain")
		class PlainController {
			@Post()
			create(@Body(z.object({ name: z.string() })) body: unknown) {
				return body;
			}
		}

		const doc = buildOpenApiDocument([PlainController], {
			title: "T",
			version: "1",
		});

		const schema = bodySchema(doc, "/plain");

		expect(schema.type).toBe("object");
		expect(schema.$schema).toBeUndefined();
	});
});

describe("route matching parity", () => {
	it("treats a whole trailing segment as a catch-all", () => {
		const matcher = new RouteMatcher();
		matcher.add("/a/**");

		expect(matcher.match("/a/b")?.path).toBe("/a/**");
		expect(matcher.match("/a/b/c")?.path).toBe("/a/**");
	});

	it("treats a glued asterisk as a literal, not a prefix", () => {
		const matcher = new RouteMatcher();
		matcher.add("/files*");

		// Bun serves this path verbatim and 404s /filesx
		expect(matcher.match("/filesx")).toBeUndefined();
		expect(matcher.match("/files*")?.path).toBe("/files*");
	});

	it("prefers the route that is static earliest, whatever the order", () => {
		for (const routes of [
			["/:x/b", "/a/:y"],
			["/a/:y", "/:x/b"],
		]) {
			const matcher = new RouteMatcher();
			for (const route of routes) matcher.add(route);
			expect(matcher.match("/a/b")?.path).toBe("/a/:y");
		}
	});

	it("gives an exact tie to the last declaration", () => {
		const matcher = new RouteMatcher();
		matcher.add("/:a");
		matcher.add("/:b");

		expect(matcher.match("/x")?.path).toBe("/:b");
	});

	it("keeps a dot inside a parameter name", () => {
		const matcher = new RouteMatcher();
		matcher.add("/f/:name.json");

		expect(matcher.match("/f/a.json")?.params["name.json"]).toBe("a.json");
	});
});
