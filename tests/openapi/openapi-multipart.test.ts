import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { z } from "zod/v4";
import { Module } from "@/core/module";
import {
	Body,
	FormData as FormDataParam,
	type FormDataPayload,
	type InferFormData,
} from "@/http/params";
import { Controller, Post } from "@/http/routing";
import { buildOpenApiDocument } from "@/openapi/builder";
import { Test } from "@/testing";

const Profile = z.object({
	name: z.string().min(2),
	age: z.coerce.number().int().optional(),
});

@Controller("uploads")
class UploadsController {
	@Post("plain")
	plain(@FormDataParam() form: FormDataPayload) {
		return { count: form.files.length };
	}

	@Post("profile")
	profile(
		@FormDataParam({
			fields: Profile,
			files: {
				avatar: {
					required: true,
					description: "Profile picture",
					accept: ["image/png", "image/jpeg"],
				},
				attachments: { multiple: true, accept: "application/pdf" },
			},
		})
		form: InferFormData<typeof Profile>,
	) {
		return { name: form.fields.name, count: form.files.length };
	}

	@Post("json")
	json(@Body(Profile) body: z.infer<typeof Profile>) {
		return body;
	}
}

const doc = buildOpenApiDocument([UploadsController], {
	title: "Uploads",
	version: "1.0.0",
}) as any;

describe("OpenAPI multipart/form-data", () => {
	it("documents a bare @FormData() as a multipart body", () => {
		expect(doc.paths["/uploads/plain"].post.requestBody).toEqual({
			required: true,
			content: { "multipart/form-data": { schema: { type: "object" } } },
		});
	});

	it("merges the fields schema with binary file properties", () => {
		const media =
			doc.paths["/uploads/profile"].post.requestBody.content[
				"multipart/form-data"
			];

		expect(media.schema.type).toBe("object");
		expect(media.schema.properties.name).toMatchObject({
			type: "string",
			minLength: 2,
		});
		expect(media.schema.properties.age).toMatchObject({ type: "integer" });
		expect(media.schema.properties.avatar).toEqual({
			type: "string",
			format: "binary",
			description: "Profile picture",
		});
		expect(media.schema.properties.attachments).toEqual({
			type: "array",
			items: { type: "string", format: "binary" },
		});
		expect(media.schema.required.sort()).toEqual(["avatar", "name"]);
	});

	it("documents accepted media types as part encodings", () => {
		const media =
			doc.paths["/uploads/profile"].post.requestBody.content[
				"multipart/form-data"
			];
		expect(media.encoding).toEqual({
			avatar: { contentType: "image/png, image/jpeg" },
			attachments: { contentType: "application/pdf" },
		});
	});

	it("keeps JSON bodies documented as application/json", () => {
		const content = doc.paths["/uploads/json"].post.requestBody.content;
		expect(Object.keys(content)).toEqual(["application/json"]);
	});

	it("serves the multipart body from a running app and accepts uploads via TestApp", async () => {
		@Module({ controllers: [UploadsController] })
		class AppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		const app = moduleRef.createTestApp();

		const body = new FormData();
		body.append("name", "ada");
		body.append("avatar", new File(["png"], "me.png", { type: "image/png" }));
		const res = await app.post("/uploads/profile", body);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ name: "ada", count: 1 });
		await moduleRef.close();
	});
});
