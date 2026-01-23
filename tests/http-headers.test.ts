import { describe, expect, test } from "bun:test";
import {
	AppStartup,
	Controller,
	Get,
	Module,
	SetResponseHeader,
} from "../index";

@Controller("headers")
class HeadersController {
	@Get("xml")
	@SetResponseHeader("Content-Type", "text/xml")
	getXml() {
		return "<xml><message>Hello</message></xml>";
	}

	@Get("html")
	@SetResponseHeader("Content-Type", "text/html; charset=utf-8")
	getHtml() {
		return "<h1>Hello</h1>";
	}

	@Get("custom")
	@SetResponseHeader("X-Custom-Header", "CustomValue")
	getCustom() {
		return { message: "Hello" };
	}
}

@Module({
	controllers: [HeadersController],
})
class HeadersModule {}

describe("HTTP Response Headers", () => {
	test("should set Content-Type to text/xml", async () => {
		const app = await AppStartup.create(HeadersModule);
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(
			new Request("http://localhost/headers/xml"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/xml");
	});

	test("should set Content-Type to text/html", async () => {
		const app = await AppStartup.create(HeadersModule);
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(
			new Request("http://localhost/headers/html"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe(
			"text/html; charset=utf-8",
		);
	});

	test("should set custom X-Custom-Header", async () => {
		const app = await AppStartup.create(HeadersModule);
		const elysia = (app as any).getElysia();

		const response = await elysia.handle(
			new Request("http://localhost/headers/custom"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("X-Custom-Header")).toBe("CustomValue");
		expect(await response.json()).toEqual({ message: "Hello" });
	});
});
