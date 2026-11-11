import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Module } from "@/core/module";
import { Controller, Get, Post } from "@/http/routing";
import { FormData as FormDataParam, Param, Req } from "@/http/params";
import type { FormDataPayload } from "@/http/params";
import { Test } from "@/testing/testing-module";
import { StorageError } from "@/storage/storage.errors";
import { StorageService } from "@/storage/storage.service";
import { createStorageClient, StorageModule } from "@/storage/storage-module";
import { createBucket, deleteBucket, uniqueBucket } from "../support/s3-bucket";
import { minioReachable, S3_TEST } from "../support/services";

const reachable = await minioReachable();
const bucket = uniqueBucket("e2e");
const connection = { ...S3_TEST, bucket };

const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

@Controller("avatars")
class AvatarsController {
	constructor(private readonly storage: StorageService) {}

	@Post()
	async upload(
		@FormDataParam({ files: { avatar: { required: true } } })
		form: FormDataPayload,
	) {
		const [avatar] = await this.storage.saveUploads(form, {
			fields: ["avatar"],
			prefix: "avatars/",
			maxSize: 1024 * 1024,
			accept: ["image/png", "image/jpeg"],
			presign: 300,
		});
		const id = avatar?.key.slice("avatars/".length);
		return { ...avatar, url: `/avatars/${id}`, presigned: avatar?.url };
	}

	@Get(":id")
	serve(@Param("id") id: string, @Req() req: Request) {
		return this.storage.serve(`avatars/${id}`, {
			request: req,
			cacheControl: "private, max-age=60",
		});
	}

	@Get(":id/redirect")
	redirect(@Param("id") id: string) {
		return this.storage.file(`avatars/${id}`);
	}
}

@Controller("gallery")
class GalleryController {
	constructor(private readonly storage: StorageService) {}

	@Post()
	upload(
		@FormDataParam({
			files: { photos: { multiple: true }, cover: {} },
		})
		form: FormDataPayload,
	) {
		return this.storage.saveUploads(form, { prefix: "gallery/" });
	}
}

@Module({
	imports: [StorageModule.register(connection)],
	controllers: [AvatarsController, GalleryController],
})
class AppModule {}

let app: Application;
let base: string;
let storage: StorageService;

beforeAll(async () => {
	if (!reachable) return;
	await createBucket(bucket);
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
	app.listen(0);
	base = String(app.getServer()?.url).replace(/\/$/, "");
	storage = app.resolve(StorageService);
});

afterAll(async () => {
	if (!reachable) return;
	await app?.close();
	await deleteBucket(bucket);
});

async function keysUnder(prefix: string): Promise<string[]> {
	const keys: string[] = [];
	for await (const object of storage.listAll(prefix)) keys.push(object.key);
	return keys;
}

function avatarForm(file: File): FormData {
	const form = new FormData();
	form.append("avatar", file);
	return form;
}

describe.skipIf(!reachable)("StorageService against MinIO", () => {
	it("writes and reads every body kind", async () => {
		const bodies: Array<[string, Parameters<StorageService["write"]>[1]]> = [
			["string", "hello"],
			["bytes", new TextEncoder().encode("hello")],
			["arraybuffer", new TextEncoder().encode("hello").buffer],
			["blob", new Blob(["hello"])],
			["file", new File(["hello"], "h.txt")],
			["response", new Response("hello")],
			["stream", new Response("hello").body as ReadableStream<Uint8Array>],
		];
		for (const [kind, body] of bodies) {
			expect({
				kind,
				bytes: await storage.write(`kinds/${kind}`, body),
			}).toEqual({
				kind,
				bytes: 5,
			});
			expect({ kind, text: await storage.text(`kinds/${kind}`) }).toEqual({
				kind,
				text: "hello",
			});
		}
		expect(await storage.bytes("kinds/bytes")).toEqual(
			new TextEncoder().encode("hello"),
		);
		await storage.write("kinds/doc.json", JSON.stringify({ a: [1, 2] }), {
			type: "application/json",
		});
		expect(await storage.json("kinds/doc.json")).toEqual({ a: [1, 2] });
		expect((await storage.stat("kinds/doc.json"))?.type).toStartWith(
			"application/json",
		);
	});

	it("reports existence, metadata, listing and deletion", async () => {
		await storage.write("meta/a.txt", "aaa", { type: "text/plain" });
		await storage.write("meta/sub/b.txt", "bb");

		expect(await storage.exists("meta/a.txt")).toBe(true);
		expect(await storage.exists("meta/none")).toBe(false);
		const stat = await storage.stat("meta/a.txt");
		expect(stat).toMatchObject({ size: 3 });
		expect(stat?.type).toStartWith("text/plain");
		expect(stat?.etag).toBeString();
		expect(stat?.lastModified).toBeInstanceOf(Date);
		expect(await storage.stat("meta/none")).toBeNull();
		expect(await storage.text("meta/none")).toBeNull();

		const listed = await storage.list({ prefix: "meta/", delimiter: "/" });
		expect(listed.objects.map((o) => o.key)).toEqual(["meta/a.txt"]);
		expect(listed.prefixes).toEqual(["meta/sub/"]);
		expect(await keysUnder("meta/")).toEqual(["meta/a.txt", "meta/sub/b.txt"]);

		await storage.delete("meta/a.txt");
		await storage.delete("meta/a.txt"); // idempotent
		expect(await storage.exists("meta/a.txt")).toBe(false);
	});

	it("pages through a listing with a cursor", async () => {
		await Promise.all(
			[1, 2, 3, 4, 5].map((n) => storage.write(`page/${n}`, String(n))),
		);
		const first = await storage.list({ prefix: "page/", limit: 2 });
		expect(first.objects).toHaveLength(2);
		expect(first.cursor).toBeString();
		expect(await keysUnder("page/")).toHaveLength(5);
	});

	it("presigns a PUT a browser can upload to, and a GET to read it", async () => {
		const put = storage.presign("direct/upload.txt", {
			method: "PUT",
			expiresIn: 60,
		});
		const uploaded = await fetch(put, {
			method: "PUT",
			body: "from the browser",
		});
		expect(uploaded.status).toBe(200);

		const get = await fetch(storage.presign("direct/upload.txt"));
		expect(await get.text()).toBe("from the browser");
	});

	it("uploads a file larger than one part as a multipart upload", async () => {
		const big = new Uint8Array(6 * 1024 * 1024 + 123).map((_, i) => i % 251);
		const [saved] = await storage.saveUploads({
			filesByField: { file: [new File([big], "big.bin")] },
		});
		const stat = await storage.stat(saved?.key as string);
		expect(stat?.size).toBe(big.length);
		expect(await storage.bytes(saved?.key as string)).toEqual(big);
	});
});

describe.skipIf(!reachable)(
	"@FormData uploads end to end (real server)",
	() => {
		it("saves the upload, then serves it back streamed", async () => {
			const res = await fetch(`${base}/avatars`, {
				method: "POST",
				body: avatarForm(
					new File([PNG], "Fotó de perfil.png", { type: "image/png" }),
				),
			});
			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				key: string;
				name: string;
				type: string;
				size: number;
				url: string;
				presigned: string;
			};
			expect(body.key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
			expect(body).toMatchObject({
				name: "Fotó de perfil.png",
				type: "image/png",
				size: PNG.length,
			});

			const served = await fetch(`${base}${body.url}`);
			expect(served.status).toBe(200);
			expect(served.headers.get("content-type")).toBe("image/png");
			// a streamed body goes out chunked; HEAD advertises the length
			expect(served.headers.get("cache-control")).toBe("private, max-age=60");
			expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG);

			const etag = served.headers.get("etag") as string;
			const cached = await fetch(`${base}${body.url}`, {
				headers: { "if-none-match": etag },
			});
			expect(cached.status).toBe(304);

			const partial = await fetch(`${base}${body.url}`, {
				headers: { range: "bytes=1-3" },
			});
			expect(partial.status).toBe(206);
			expect(partial.headers.get("content-range")).toBe(
				`bytes 1-3/${PNG.length}`,
			);
			expect(new Uint8Array(await partial.arrayBuffer())).toEqual(
				PNG.slice(1, 4),
			);

			const head = await fetch(`${base}${body.url}`, { method: "HEAD" });
			expect(head.status).toBe(200);
			expect(head.headers.get("content-length")).toBe(String(PNG.length));

			// the presigned GET keeps the original filename
			const direct = await fetch(body.presigned);
			expect(direct.headers.get("content-type")).toBe("image/png");
			expect(direct.headers.get("content-disposition")).toBe(
				`inline; filename="Fot_ de perfil.png"; filename*=UTF-8''Fot%C3%B3%20de%20perfil.png`,
			);
			expect(new Uint8Array(await direct.arrayBuffer())).toEqual(PNG);
		});

		it("redirects to a presigned URL when a handler returns the S3File", async () => {
			const res = await fetch(`${base}/avatars`, {
				method: "POST",
				body: avatarForm(new File([PNG], "a.png", { type: "image/png" })),
			});
			const { url } = (await res.json()) as { url: string };

			const redirect = await fetch(`${base}${url}/redirect`, {
				redirect: "manual",
			});
			expect(redirect.status).toBe(302);
			const location = redirect.headers.get("location") as string;
			expect(location).toContain("X-Amz-Signature=");

			const followed = await fetch(`${base}${url}/redirect`);
			expect(followed.status).toBe(200);
			expect(followed.headers.get("content-type")).toBe("image/png");
			expect(new Uint8Array(await followed.arrayBuffer())).toEqual(PNG);
		});

		it("is a 404 for an object that does not exist", async () => {
			const res = await fetch(`${base}/avatars/nope.png`);
			expect(res.status).toBe(404);
		});

		it("rejects a disallowed type or size with the @FormData 400 shape", async () => {
			const before = await keysUnder("avatars/");
			const wrongType = await fetch(`${base}/avatars`, {
				method: "POST",
				body: avatarForm(
					new File(["MZ"], "x.exe", { type: "application/x-msdownload" }),
				),
			});
			expect(wrongType.status).toBe(400);
			expect(await wrongType.json()).toEqual({
				statusCode: 400,
				errors: [
					{
						field: "avatar",
						message:
							'File type "application/x-msdownload" is not accepted; expected image/png, image/jpeg.',
					},
				],
			});

			const tooBig = await fetch(`${base}/avatars`, {
				method: "POST",
				body: avatarForm(
					new File([new Uint8Array(1024 * 1024 + 1)], "big.png", {
						type: "image/png",
					}),
				),
			});
			expect(tooBig.status).toBe(400);
			expect(((await tooBig.json()) as { errors: unknown[] }).errors).toEqual([
				{
					field: "avatar",
					message: `File is too large: ${1024 * 1024 + 1} bytes, the limit is 1048576.`,
				},
			]);

			// nothing was written for either request
			expect(await keysUnder("avatars/")).toEqual(before);
		});

		it("leaves a missing required file to @FormData", async () => {
			const res = await fetch(`${base}/avatars`, {
				method: "POST",
				body: new FormData(),
			});
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({
				statusCode: 400,
				errors: [{ field: "avatar", message: "File is required." }],
			});
		});
	},
);

describe.skipIf(!reachable)("@FormData uploads through TestApp", () => {
	it("saves multiple files per field and skips a blank optional input", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		try {
			const testApp = moduleRef.createTestApp();
			const form = new FormData();
			form.append("photos", new File(["one"], "1.jpg", { type: "image/jpeg" }));
			form.append("photos", new File(["two"], "2.jpg", { type: "image/jpeg" }));
			// what a browser sends for an <input type="file"> left empty
			form.append(
				"cover",
				new File([], "", { type: "application/octet-stream" }),
			);

			const res = await testApp.post("/gallery", form);
			expect(res.status).toBe(200);
			const saved = (await res.json()) as Array<{
				key: string;
				field: string;
				name: string;
			}>;
			expect(saved.map((f) => [f.field, f.name])).toEqual([
				["photos", "1.jpg"],
				["photos", "2.jpg"],
			]);
			for (const file of saved) expect(file.key).toMatch(/^gallery\/.+\.jpg$/);
			const texts = await Promise.all(saved.map((f) => storage.text(f.key)));
			expect(texts).toEqual(["one", "two"]);
		} finally {
			await moduleRef.close();
		}
	});
});

describe.skipIf(!reachable)("storage errors against MinIO", () => {
	async function codeOf(service: StorageService): Promise<string | undefined> {
		try {
			await service.write("probe", "x");
		} catch (error) {
			expect(error).toBeInstanceOf(StorageError);
			return (error as StorageError).code;
		}
		return undefined;
	}

	it("maps wrong credentials to BNS-STG-002", async () => {
		const wrong = new StorageService(
			createStorageClient({ ...connection, secretAccessKey: "wrong-secret" }),
			{ bucket },
		);
		expect(await codeOf(wrong)).toBe("BNS-STG-002");
	});

	it("maps a missing bucket to BNS-STG-003", async () => {
		const missing = `${bucket}-missing`;
		const service = new StorageService(
			createStorageClient({ ...connection, bucket: missing }),
			{ bucket: missing },
		);
		expect(await codeOf(service)).toBe("BNS-STG-003");
		expect(service.text("x")).rejects.toBeInstanceOf(StorageError);
	});

	it("maps an unreachable endpoint to BNS-STG-004", async () => {
		const service = new StorageService(
			createStorageClient({ ...connection, endpoint: "http://127.0.0.1:1" }),
		);
		expect(await codeOf(service)).toBe("BNS-STG-004");
	});
});
