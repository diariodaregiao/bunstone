import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import {
	FormData as FormDataParam,
	type FormDataPayload,
	type InferFormData,
} from "@/http/params";
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

const Profile = z.object({
	name: z.string().min(2),
	age: z.coerce.number().int(),
});

@Controller("profiles")
class ProfileController {
	@Post()
	create(
		@FormDataParam({
			fields: Profile,
			files: {
				avatar: { required: true, accept: ["image/png"] },
				attachments: { multiple: true },
			},
		})
		form: InferFormData<typeof Profile>,
	) {
		return {
			fields: form.fields,
			avatar: form.filesByField.avatar?.map((f) => f.name),
			attachments: form.filesByField.attachments?.map((f) => f.name) ?? [],
		};
	}
}

@Module({ controllers: [UploadController, ProfileController] })
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

	it("validates fields with the schema and groups files by field", async () => {
		const body = new FormData();
		body.append("name", "ada");
		body.append("age", "36");
		body.append("avatar", new File(["png"], "me.png", { type: "image/png" }));
		body.append("attachments", new File(["a"], "a.txt"));
		body.append("attachments", new File(["b"], "b.txt"));

		const res = await fetch(`${base}/profiles`, { method: "POST", body });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			fields: { name: "ada", age: 36 },
			avatar: ["me.png"],
			attachments: ["a.txt", "b.txt"],
		});
	});

	it("rejects invalid fields and a missing required file together", async () => {
		const body = new FormData();
		body.append("name", "a");
		body.append("age", "36");

		const res = await fetch(`${base}/profiles`, { method: "POST", body });
		expect(res.status).toBe(400);
		const payload = (await res.json()) as {
			errors: { field: string; message: string }[];
		};
		expect(payload.errors.map((e) => e.field).sort()).toEqual([
			"avatar",
			"name",
		]);
		expect(payload.errors).toContainEqual({
			field: "avatar",
			message: "File is required.",
		});
	});

	it("treats a blank file input as a missing file", async () => {
		const body = new FormData();
		body.append("name", "ada");
		body.append("age", "36");
		body.append("avatar", new File([], ""));

		const res = await fetch(`${base}/profiles`, { method: "POST", body });
		expect(res.status).toBe(400);
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
