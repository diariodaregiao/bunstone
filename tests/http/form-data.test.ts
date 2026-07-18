import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { FormData as FormDataParam, type FormDataPayload } from "@/http/params";
import { Controller, Post } from "@/http/routing";

@Controller("upload")
class UploadController {
	@Post()
	handle(@FormDataParam() form: FormDataPayload) {
		return {
			fields: form.fields,
			files: form.files.map((f) => ({ name: f.name, size: f.size })),
		};
	}
}

@Module({ controllers: [UploadController] })
class AppModule {}

let app: Application;
let base: string;

beforeAll(async () => {
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	base = app.getServer()?.url.href.replace(/\/$/, "") ?? "";
});

afterAll(async () => {
	await app.close();
});

describe("@FormData", () => {
	it("extracts fields and files from a multipart request", async () => {
		const body = new FormData();
		body.append("name", "ada");
		body.append("file", new File(["hello"], "greeting.txt"));

		const res = await fetch(`${base}/upload`, { method: "POST", body });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			fields: { name: "ada" },
			files: [{ name: "greeting.txt", size: 5 }],
		});
	});

	it("rejects a non-multipart body with 400", async () => {
		const res = await fetch(`${base}/upload`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ nope: true }),
		});
		expect(res.status).toBe(400);
	});
});
