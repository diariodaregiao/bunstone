import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import type { S3Client } from "bun";
import { Application } from "@/core/application";
import { Inject, Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { BadRequestException, NotFoundException } from "@/http/exceptions";
import { StorageError } from "@/storage/storage.errors";
import { parseRange, StorageService } from "@/storage/storage.service";
import {
	InjectStorage,
	STORAGE_CLIENT,
	storageClientToken,
} from "@/storage/storage.tokens";
import { createStorageClient, StorageModule } from "@/storage/storage-module";
import {
	accepts,
	contentDisposition,
	generateKey,
	safeExtension,
} from "@/storage/uploads";

class S3Failure extends Error {
	constructor(readonly code: string) {
		super(`fake ${code}`);
		this.name = "S3Error";
	}
}

interface Stored {
	body: Uint8Array;
	options: Record<string, unknown>;
}

/** Just enough of `Bun.S3Client` to exercise the service without a server. */
class FakeS3 {
	readonly objects = new Map<string, Stored>();
	failWrite?: (key: string) => string | undefined;
	failAll?: string;

	private check(key?: string) {
		if (this.failAll) throw new S3Failure(this.failAll);
		if (key === "") throw new S3Failure("ERR_S3_INVALID_PATH");
	}

	private missing(key: string): Stored {
		const object = this.objects.get(key);
		if (!object) throw new S3Failure("NoSuchKey");
		return object;
	}

	async write(key: string, data: unknown, options = {}) {
		this.check(key);
		const reason = this.failWrite?.(key);
		if (reason) throw new S3Failure(reason);
		const source =
			data instanceof Response
				? data
				: new Response(data as ConstructorParameters<typeof Response>[0]);
		const body = new Uint8Array(await source.arrayBuffer());
		this.objects.set(key, { body, options });
		return body.length;
	}

	file(key: string) {
		const fake = this;
		const read = () => {
			fake.check(key);
			return fake.missing(key).body;
		};
		return {
			text: async () => new TextDecoder().decode(read()),
			bytes: async () => read(),
			stream: () => new Response(read()).body,
			slice: (start: number, end: number) => ({
				stream: () => new Response(read().slice(start, end)).body,
			}),
		};
	}

	async exists(key: string) {
		this.check(key);
		return this.objects.has(key);
	}

	async stat(key: string) {
		this.check(key);
		const object = this.missing(key);
		return {
			size: object.body.length,
			type: (object.options.type as string) ?? "application/octet-stream",
			etag: '"etag-1"',
			lastModified: new Date("2026-01-02T03:04:05Z"),
		};
	}

	async delete(key: string) {
		this.check(key);
		this.objects.delete(key);
	}

	async list(input: {
		prefix?: string;
		maxKeys?: number;
		continuationToken?: string;
	}) {
		this.check();
		const keys = [...this.objects.keys()]
			.filter((k) => k.startsWith(input.prefix ?? ""))
			.sort();
		const start = Number(input.continuationToken ?? 0);
		const size = input.maxKeys ?? 2;
		const page = keys.slice(start, start + size);
		const truncated = start + size < keys.length;
		return {
			contents: page.map((key) => ({
				key,
				size: this.objects.get(key)?.body.length,
				eTag: '"e"',
				lastModified: "2026-01-02T03:04:05.000Z",
			})),
			isTruncated: truncated,
			nextContinuationToken: truncated ? String(start + size) : undefined,
		};
	}

	presign(key: string, options: { expiresIn?: number; method?: string } = {}) {
		this.check(key);
		return `https://s3.test/${key}?X-Amz-Expires=${options.expiresIn}&method=${options.method ?? "GET"}`;
	}
}

function setup(options: { publicUrl?: string } = {}) {
	const s3 = new FakeS3();
	const storage = new StorageService(s3 as unknown as S3Client, {
		bucket: "test-bucket",
		...options,
	});
	return { s3, storage };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error("expected a rejection");
}

describe("StorageService reads", () => {
	it("returns null for a missing object instead of throwing", async () => {
		const { storage } = setup();
		expect(await storage.text("nope")).toBeNull();
		expect(await storage.bytes("nope")).toBeNull();
		expect(await storage.json("nope")).toBeNull();
		expect(await storage.stat("nope")).toBeNull();
		expect(await storage.exists("nope")).toBe(false);
	});

	it("round-trips text, bytes and JSON", async () => {
		const { storage } = setup();
		await storage.write("a.json", JSON.stringify({ ok: 1 }), {
			type: "application/json",
		});
		expect(await storage.text("a.json")).toBe('{"ok":1}');
		expect(await storage.json<{ ok: number }>("a.json")).toEqual({ ok: 1 });
		expect(await storage.bytes("a.json")).toEqual(
			new TextEncoder().encode('{"ok":1}'),
		);
		expect(await storage.stat("a.json")).toMatchObject({
			size: 8,
			type: "application/json",
		});
	});

	it("wraps a ReadableStream body so Bun can upload it", async () => {
		const { s3, storage } = setup();
		const stream = new Response("streamed").body as ReadableStream<Uint8Array>;
		expect(await storage.write("s", stream)).toBe(8);
		expect(new TextDecoder().decode(s3.objects.get("s")?.body)).toBe(
			"streamed",
		);
	});

	it("rejects invalid JSON with a StorageError", async () => {
		const { storage } = setup();
		await storage.write("bad", "{nope");
		const error = await errorOf(storage.json("bad"));
		expect(error).toBeInstanceOf(StorageError);
		expect((error as StorageError).code).toBe("BNS-STG-001");
	});
});

describe("StorageService errors", () => {
	const cases: Array<[string, string]> = [
		["SignatureDoesNotMatch", "BNS-STG-002"],
		["InvalidAccessKeyId", "BNS-STG-002"],
		["AccessDenied", "BNS-STG-002"],
		["NoSuchBucket", "BNS-STG-003"],
		["ConnectionRefused", "BNS-STG-004"],
		["ERR_S3_INVALID_PATH", "BNS-STG-005"],
		["InternalError", "BNS-STG-001"],
	];
	for (const [s3Code, code] of cases) {
		it(`maps ${s3Code} to ${code}`, async () => {
			const { s3, storage } = setup();
			s3.failAll = s3Code;
			const error = (await errorOf(storage.write("k", "v"))) as StorageError;
			expect(error).toBeInstanceOf(StorageError);
			expect(error.code).toBe(code);
			expect(error.context).toMatchObject({
				operation: "write",
				key: "k",
				bucket: "test-bucket",
				s3Code,
			});
			expect((error.cause as S3Failure).code).toBe(s3Code);
		});
	}

	it("does not turn a missing bucket into a null read", async () => {
		const { s3, storage } = setup();
		s3.failAll = "NoSuchBucket";
		const error = (await errorOf(storage.text("k"))) as StorageError;
		expect(error.code).toBe("BNS-STG-003");
	});

	it("maps a presign failure synchronously", () => {
		const { storage } = setup();
		expect(() => storage.presign("")).toThrow(StorageError);
	});
});

describe("StorageService.list", () => {
	it("pages with a cursor and walks everything with listAll", async () => {
		const { storage } = setup();
		for (const key of ["p/1", "p/2", "p/3", "q/1"])
			await storage.write(key, key);
		const first = await storage.list({ prefix: "p/", limit: 2 });
		expect(first.objects.map((o) => o.key)).toEqual(["p/1", "p/2"]);
		expect(first.cursor).toBe("2");
		expect(first.objects[0]?.lastModified).toBeInstanceOf(Date);
		const second = await storage.list({ prefix: "p/", cursor: first.cursor });
		expect(second.objects.map((o) => o.key)).toEqual(["p/3"]);
		expect(second.cursor).toBeUndefined();

		const all: string[] = [];
		for await (const object of storage.listAll("p/")) all.push(object.key);
		expect(all).toEqual(["p/1", "p/2", "p/3"]);
	});
});

describe("StorageService URLs", () => {
	it("presigns with a one-hour default", () => {
		const { storage } = setup();
		expect(storage.presign("a")).toContain("X-Amz-Expires=3600");
		expect(storage.presign("a", { expiresIn: 60, method: "PUT" })).toContain(
			"X-Amz-Expires=60&method=PUT",
		);
	});

	it("builds public URLs with encoded segments", () => {
		const { storage } = setup({ publicUrl: "https://cdn.example.com/" });
		expect(storage.url("avatars/my file.png")).toBe(
			"https://cdn.example.com/avatars/my%20file.png",
		);
	});

	it("refuses a public URL without publicUrl", () => {
		const { storage } = setup();
		expect(() => storage.url("a")).toThrow(StorageError);
	});
});

describe("StorageService.serve", () => {
	async function served(range?: string, extra: Record<string, string> = {}) {
		const { storage } = setup();
		await storage.write("docs/report.txt", "0123456789", {
			type: "text/plain",
		});
		const headers = new Headers(extra);
		if (range) headers.set("range", range);
		return storage.serve("docs/report.txt", {
			request: new Request("http://x/", { headers }),
		});
	}

	it("streams the whole object with its metadata", async () => {
		const response = await served();
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("text/plain");
		expect(response.headers.get("content-length")).toBe("10");
		expect(response.headers.get("etag")).toBe('"etag-1"');
		expect(response.headers.get("accept-ranges")).toBe("bytes");
		expect(await response.text()).toBe("0123456789");
	});

	it("answers a Range with 206", async () => {
		const response = await served("bytes=2-4");
		expect(response.status).toBe(206);
		expect(response.headers.get("content-range")).toBe("bytes 2-4/10");
		expect(await response.text()).toBe("234");
	});

	it("answers an unsatisfiable Range with 416", async () => {
		const response = await served("bytes=50-");
		expect(response.status).toBe(416);
		expect(response.headers.get("content-range")).toBe("bytes */10");
	});

	it("answers a matching If-None-Match with 304", async () => {
		const response = await served(undefined, { "if-none-match": '"etag-1"' });
		expect(response.status).toBe(304);
	});

	it("sets an attachment disposition on download", async () => {
		const { storage } = setup();
		await storage.write("k/report.txt", "x");
		const response = await storage.serve("k/report.txt", { download: true });
		expect(response.headers.get("content-disposition")).toStartWith(
			'attachment; filename="report.txt"',
		);
	});

	it("is a 404 for a missing object", async () => {
		const { storage } = setup();
		expect(await errorOf(storage.serve("nope"))).toBeInstanceOf(
			NotFoundException,
		);
	});
});

describe("parseRange", () => {
	it("handles the single-range forms", () => {
		expect(parseRange("bytes=0-0", 10)).toEqual([0, 0]);
		expect(parseRange("bytes=5-", 10)).toEqual([5, 9]);
		expect(parseRange("bytes=-3", 10)).toEqual([7, 9]);
		expect(parseRange("bytes=-30", 10)).toEqual([0, 9]);
		expect(parseRange("bytes=8-100", 10)).toEqual([8, 9]);
	});

	it("ignores what it does not support", () => {
		expect(parseRange(undefined, 10)).toBeUndefined();
		expect(parseRange("bytes=0-1,4-5", 10)).toBeUndefined();
		expect(parseRange("items=0-1", 10)).toBeUndefined();
		expect(parseRange("bytes=5-2", 10)).toBeUndefined();
	});

	it("reports unsatisfiable ranges", () => {
		expect(parseRange("bytes=10-", 10)).toBe("unsatisfiable");
		expect(parseRange("bytes=-0", 10)).toBe("unsatisfiable");
		expect(parseRange("bytes=0-", 0)).toBe("unsatisfiable");
	});
});

describe("StorageService uploads", () => {
	const png = (name = "photo.PNG", size = 4) =>
		new File([new Uint8Array(size)], name, { type: "image/png" });
	const blank = () => new File([], "", { type: "application/octet-stream" });

	it("saves under a generated key and keeps the original name", async () => {
		const { s3, storage } = setup();
		const saved = await storage.save(png("../../etc/passwd.png"), {
			prefix: "avatars/",
		});
		expect(saved.key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
		expect(saved).toMatchObject({
			field: "file",
			name: "../../etc/passwd.png",
			type: "image/png",
			size: 4,
		});
		const stored = s3.objects.get(saved.key);
		expect(stored?.options.type).toBe("image/png");
		expect(stored?.options.contentDisposition).toBe(
			`inline; filename=".._.._etc_passwd.png"; filename*=UTF-8''.._.._etc_passwd.png`,
		);
	});

	it("returns a presigned or public URL when asked", async () => {
		const { storage } = setup({ publicUrl: "https://cdn.test" });
		const pub = await storage.save(png(), { prefix: "a/" });
		expect(pub.url).toBe(`https://cdn.test/${pub.key}`);
		const signed = await storage.save(png(), { prefix: "a/", presign: 120 });
		expect(signed.url).toContain("X-Amz-Expires=120");
	});

	it("saves every file of a payload, grouped fields and multiples", async () => {
		const { s3, storage } = setup();
		const saved = await storage.saveUploads(
			{
				filesByField: {
					avatar: [png("me.png")],
					attachments: [png("a.png"), png("b.png")],
					optional: [blank()],
				},
			},
			{ prefix: "u/" },
		);
		expect(saved.map((f) => [f.field, f.name])).toEqual([
			["avatar", "me.png"],
			["attachments", "a.png"],
			["attachments", "b.png"],
		]);
		expect(s3.objects.size).toBe(3);
		expect(new Set(saved.map((f) => f.key)).size).toBe(3);
	});

	it("only saves the listed fields", async () => {
		const { storage } = setup();
		const saved = await storage.saveUploads(
			{ filesByField: { avatar: [png()], other: [png()] } },
			{ fields: ["avatar"] },
		);
		expect(saved.map((f) => f.field)).toEqual(["avatar"]);
	});

	it("rejects with the @FormData 400 shape before writing anything", async () => {
		const { s3, storage } = setup();
		const error = (await errorOf(
			storage.saveUploads(
				{
					filesByField: {
						avatar: [png("big.png", 100)],
						doc: [
							new File(["x"], "x.exe", { type: "application/x-msdownload" }),
						],
					},
				},
				{ maxSize: 10, accept: ["image/*", "application/pdf"] },
			),
		)) as BadRequestException;
		expect(error).toBeInstanceOf(BadRequestException);
		expect(error.getStatus?.() ?? 400).toBe(400);
		expect(error.response).toEqual({
			statusCode: 400,
			errors: [
				{
					field: "avatar",
					message: "File is too large: 100 bytes, the limit is 10.",
				},
				{
					field: "doc",
					message:
						'File type "application/x-msdownload" is not accepted; expected image/*, application/pdf.',
				},
			],
		});
		expect(s3.objects.size).toBe(0);
	});

	it("rejects a blank file passed to save", async () => {
		const { storage } = setup();
		const error = (await errorOf(
			storage.save(blank(), { field: "avatar" }),
		)) as BadRequestException;
		expect(error.response).toEqual({
			statusCode: 400,
			errors: [{ field: "avatar", message: "File is required." }],
		});
	});

	it("deletes what it already wrote when one upload fails", async () => {
		const { s3, storage } = setup();
		let writes = 0;
		s3.failWrite = () => (++writes === 2 ? "InternalError" : undefined);
		const error = await errorOf(
			storage.saveUploads({ filesByField: { f: [png(), png(), png()] } }),
		);
		expect(error).toBeInstanceOf(StorageError);
		expect(s3.objects.size).toBe(0);
	});

	it("lets the caller choose the key", async () => {
		const { storage } = setup();
		const saved = await storage.save(png(), {
			key: (_file, field) => `fixed/${field}.png`,
			field: "cover",
		});
		expect(saved.key).toBe("fixed/cover.png");
	});
});

describe("upload helpers", () => {
	it("keeps only a safe extension", () => {
		expect(safeExtension("a.JPG")).toBe(".jpg");
		expect(safeExtension("archive.tar.gz")).toBe(".gz");
		expect(safeExtension(".env")).toBe("");
		expect(safeExtension("x.p/h/p")).toBe("");
		expect(safeExtension("x.")).toBe("");
		expect(safeExtension(undefined)).toBe("");
	});

	it("generates unique, prefixed keys", () => {
		const a = generateKey("p/", "x.png");
		expect(a).toMatch(/^p\/[0-9a-f-]{36}\.png$/);
		expect(generateKey("p/", "x.png")).not.toBe(a);
	});

	it("matches media types with wildcards", () => {
		expect(accepts("image/png", "image/*")).toBe(true);
		expect(accepts("image/png", ["application/pdf"])).toBe(false);
		expect(accepts("text/plain", "*/*")).toBe(true);
		expect(accepts("image/png", "IMAGE/PNG")).toBe(true);
	});

	it("encodes a non-ASCII filename for Content-Disposition", () => {
		expect(contentDisposition("résumé (1).pdf", "attachment")).toBe(
			`attachment; filename="r_sum_ (1).pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%281%29.pdf`,
		);
		expect(contentDisposition("")).toBe("inline");
	});
});

describe("StorageModule", () => {
	it("leaves unset options to Bun's S3_* environment fallbacks", () => {
		// Bun reads the S3_* variables at startup, hence the subprocess
		const script = [
			'import { createStorageClient } from "@/storage/storage-module";',
			'const client = createStorageClient({ bucket: "b", endpoint: undefined, name: "x", publicUrl: "https://p" });',
			'console.log(client.presign("k"));',
		].join("\n");
		const run = Bun.spawnSync(["bun", "-e", script], {
			cwd: `${import.meta.dir}/../..`,
			env: {
				...process.env,
				S3_ENDPOINT: "http://from-env:9000",
				S3_ACCESS_KEY_ID: "env-key",
				S3_SECRET_ACCESS_KEY: "env-secret",
			},
		});
		const url = run.stdout.toString();
		expect(url).toStartWith("http://from-env:9000/b/k?");
		expect(url).toContain("env-key");
	});

	it("reports missing credentials as a configuration error", () => {
		const storage = new StorageService(createStorageClient({ bucket: "b" }));
		let error: StorageError | undefined;
		try {
			storage.presign("k");
		} catch (caught) {
			error = caught as StorageError;
		}
		expect(error).toBeInstanceOf(StorageError);
		expect(error?.code).toBe("BNS-STG-005");
	});

	it("provides the default and named storages through DI", async () => {
		@Injectable()
		class Consumer {
			constructor(
				readonly main: StorageService,
				@InjectStorage("avatars") readonly avatars: StorageService,
				@Inject(STORAGE_CLIENT) readonly client: S3Client,
			) {}
		}

		const connection = {
			endpoint: "http://localhost:1",
			accessKeyId: "k",
			secretAccessKey: "s",
		};
		@Module({
			imports: [
				StorageModule.register({ ...connection, bucket: "main" }),
				StorageModule.register({
					...connection,
					bucket: "avatars",
					name: "avatars",
					publicUrl: "https://avatars.cdn",
				}),
			],
			providers: [Consumer],
		})
		class AppModule {}

		const app = await Application.create(AppModule, {
			gracefulShutdown: false,
			logStartup: false,
		});
		try {
			const consumer = app.resolve(Consumer);
			expect(consumer.main).toBeInstanceOf(StorageService);
			expect(consumer.main).not.toBe(consumer.avatars);
			expect(consumer.main.client).toBe(consumer.client);
			expect(consumer.avatars.client).toBe(
				app.resolve(storageClientToken("avatars")),
			);
			expect(consumer.main.presign("k")).toContain("/main/k");
			expect(consumer.avatars.url("a.png")).toBe("https://avatars.cdn/a.png");
		} finally {
			await app.close();
		}
	});
});
