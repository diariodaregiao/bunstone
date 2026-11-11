import type { S3Client, S3File, S3FilePresignOptions, S3Options } from "bun";
import { BadRequestException, NotFoundException } from "@/http/exceptions";
import type { FormDataPayload } from "@/http/params";
import { instrumentStorage } from "./storage.instrumentation";
import { StorageError, s3CodeOf } from "./storage.errors";
import {
	checkLimits,
	contentDisposition,
	type FieldError,
	generateKey,
	isChosenFile,
	mediaType,
	type UploadLimits,
} from "./uploads";

/** Anything `Bun.S3Client.write` accepts, plus a `ReadableStream`. */
export type StorageBody =
	Parameters<S3Client["write"]>[1] | ReadableStream<Uint8Array>;

export type WriteOptions = Pick<
	S3Options,
	"type" | "contentDisposition" | "contentEncoding" | "acl" | "storageClass"
>;

export interface PresignOptions extends Pick<
	S3FilePresignOptions,
	"method" | "type" | "contentDisposition" | "acl"
> {
	/** Seconds the URL stays valid. Default 3600 (one hour). */
	expiresIn?: number;
}

export interface StorageStat {
	size: number;
	type: string;
	etag: string;
	lastModified: Date;
}

export interface StorageObject {
	key: string;
	size: number;
	etag?: string;
	lastModified?: Date;
}

export interface ListOptions {
	prefix?: string;
	/** Group keys by this separator (usually `/`) into `prefixes`. */
	delimiter?: string;
	/** Maximum objects per page (S3 caps it at 1000). */
	limit?: number;
	/** The `cursor` of the previous page. */
	cursor?: string;
	startAfter?: string;
}

export interface ListResult {
	objects: StorageObject[];
	/** The "folders" under `prefix` when a `delimiter` is given. */
	prefixes: string[];
	/** Pass it back as `cursor` to read the next page; absent on the last one. */
	cursor?: string;
}

export interface ServeOptions {
	/** The incoming request, to honour `Range`, `If-None-Match` and `HEAD`. */
	request?: Request;
	/** Send as an attachment; a string sets the download's filename. */
	download?: boolean | string;
	/** A `Cache-Control` header for the response. */
	cacheControl?: string;
	/** Overrides the content type the object was stored with. */
	type?: string;
}

export interface SaveOptions extends UploadLimits {
	/** Prepended to the generated key, e.g. `"avatars/"`. */
	prefix?: string;
	/** Chooses the key yourself instead of `prefix + UUIDv7 + extension`. */
	key?: (file: Blob, field: string) => string;
	/**
	 * How browsers open the object. The original filename is kept in the
	 * `Content-Disposition` either way. `false` stores none. Default `"inline"`.
	 */
	disposition?: "inline" | "attachment" | false;
	/** Also return a presigned GET URL valid for this many seconds. */
	presign?: number;
	acl?: S3Options["acl"];
	storageClass?: S3Options["storageClass"];
}

export interface SaveUploadsOptions extends SaveOptions {
	/** Only save the files sent under these form fields. Default: every field. */
	fields?: readonly string[];
}

export interface SaveFileOptions extends SaveOptions {
	/** The form field reported in a validation error. Default `"file"`. */
	field?: string;
}

/** What was stored for one uploaded file. */
export interface StoredFile {
	/** The object key: generated, never derived from the client's filename. */
	key: string;
	/** The form field the file was sent under. */
	field: string;
	/** The filename the client sent, for display only. */
	name: string;
	type: string;
	size: number;
	/** A presigned GET URL (with `presign`), or the public URL (with `publicUrl`). */
	url?: string;
}

export interface StorageServiceOptions {
	bucket?: string;
	publicUrl?: string;
}

const DEFAULT_PRESIGN_SECONDS = 3600;

/**
 * Object storage on Bun's native S3 client: AWS S3, Cloudflare R2, MinIO and
 * anything else that speaks the S3 API. Reads of a missing object resolve to
 * `null`; every other failure is a `StorageError`.
 */
export class StorageService {
	private readonly bucket: string | undefined;
	private readonly publicUrl: string | undefined;

	constructor(
		private readonly s3: S3Client,
		options: StorageServiceOptions = {},
	) {
		this.bucket =
			options.bucket ?? process.env.S3_BUCKET ?? process.env.AWS_BUCKET;
		this.publicUrl = options.publicUrl?.replace(/\/+$/, "");
	}

	/** The underlying `Bun.S3Client`. */
	get client(): S3Client {
		return this.s3;
	}

	/** A lazy handle on an object; nothing is fetched until it is read. */
	file(key: string): S3File {
		return this.s3.file(key);
	}

	/** Writes an object and resolves to the number of bytes written. */
	write(
		key: string,
		body: StorageBody,
		options: WriteOptions = {},
	): Promise<number> {
		// Bun streams a Response body as a multipart upload; a bare stream is
		// not accepted by `write`, so it is wrapped rather than buffered
		const data = body instanceof ReadableStream ? new Response(body) : body;
		return this.run("write", key, () => this.s3.write(key, data, options));
	}

	text(key: string): Promise<string | null> {
		return this.read("read", key, () => this.s3.file(key).text());
	}

	bytes(key: string): Promise<Uint8Array | null> {
		return this.read("read", key, () => this.s3.file(key).bytes());
	}

	async json<T = unknown>(key: string): Promise<T | null> {
		const text = await this.text(key);
		if (text === null) return null;
		try {
			return JSON.parse(text) as T;
		} catch (error) {
			throw new StorageError(
				`Object "${key}" is not valid JSON.`,
				"BNS-STG-001",
				"Read it with `text(key)` if it is not meant to be JSON.",
				{ operation: "read", key, bucket: this.bucket },
				error as Error,
			);
		}
	}

	exists(key: string): Promise<boolean> {
		return this.run("exists", key, () => this.s3.exists(key));
	}

	/** Size, type, ETag and modification time, or `null` when the object is missing. */
	async stat(key: string): Promise<StorageStat | null> {
		const stat = await this.read("stat", key, () => this.s3.stat(key));
		if (stat === null) return null;
		return {
			size: stat.size,
			type: stat.type,
			etag: stat.etag,
			lastModified: stat.lastModified,
		};
	}

	/** Deletes an object. Deleting a missing object is not an error. */
	async delete(key: string): Promise<void> {
		await this.run("delete", key, () => this.s3.delete(key));
	}

	/** One page of objects. Follow `cursor` for the next, or use `listAll`. */
	async list(options: ListOptions = {}): Promise<ListResult> {
		const page = await this.run("list", options.prefix, () =>
			this.s3.list({
				prefix: options.prefix,
				delimiter: options.delimiter,
				maxKeys: options.limit,
				continuationToken: options.cursor,
				startAfter: options.startAfter,
			}),
		);
		return {
			objects: (page.contents ?? []).map((entry) => ({
				key: entry.key,
				size: entry.size ?? 0,
				etag: entry.eTag,
				lastModified: entry.lastModified
					? new Date(entry.lastModified)
					: undefined,
			})),
			prefixes: (page.commonPrefixes ?? []).map((entry) => entry.prefix),
			cursor: page.isTruncated ? page.nextContinuationToken : undefined,
		};
	}

	/** Every object under `prefix`, fetching pages as it goes. */
	async *listAll(prefix?: string): AsyncGenerator<StorageObject> {
		let cursor: string | undefined;
		do {
			const page = await this.list({ prefix, cursor });
			yield* page.objects;
			cursor = page.cursor;
		} while (cursor);
	}

	/**
	 * A signed URL that grants one operation on one key without credentials:
	 * a `GET` to download, a `PUT` for a browser to upload directly. Signing
	 * is local; no request is made.
	 */
	presign(key: string, options: PresignOptions = {}): string {
		try {
			return this.s3.presign(key, {
				...options,
				expiresIn: options.expiresIn ?? DEFAULT_PRESIGN_SECONDS,
			});
		} catch (error) {
			throw StorageError.from(error, "presign", key, this.bucket);
		}
	}

	/** The public URL of an object; requires `publicUrl` in the options. */
	url(key: string): string {
		if (!this.publicUrl) throw StorageError.noPublicUrl(key);
		const path = key.split("/").map(encodeURIComponent).join("/");
		return `${this.publicUrl}/${path}`;
	}

	/**
	 * Streams an object through the application, with its content type,
	 * length and ETag. Pass the request to answer `Range` (206),
	 * `If-None-Match` (304) and `HEAD`. A missing object is a 404.
	 */
	async serve(key: string, options: ServeOptions = {}): Promise<Response> {
		const stat = await this.stat(key);
		if (!stat) throw new NotFoundException("Object not found.");

		const headers = new Headers({
			"content-type": options.type ?? (stat.type || "application/octet-stream"),
			"accept-ranges": "bytes",
			etag: stat.etag,
			"last-modified": stat.lastModified.toUTCString(),
		});
		if (options.cacheControl)
			headers.set("cache-control", options.cacheControl);
		if (options.download) {
			const name =
				typeof options.download === "string"
					? options.download
					: key.slice(key.lastIndexOf("/") + 1);
			headers.set(
				"content-disposition",
				contentDisposition(name, "attachment"),
			);
		}

		const request = options.request;
		const ifNoneMatch = request?.headers.get("if-none-match");
		if (ifNoneMatch && matchesEtag(ifNoneMatch, stat.etag)) {
			return new Response(null, { status: 304, headers });
		}

		const head = request?.method === "HEAD";
		const range = parseRange(request?.headers.get("range"), stat.size);
		if (range === "unsatisfiable") {
			headers.set("content-range", `bytes */${stat.size}`);
			return new Response(null, { status: 416, headers });
		}
		const file = this.s3.file(key);
		if (range) {
			const [start, end] = range;
			headers.set("content-range", `bytes ${start}-${end}/${stat.size}`);
			headers.set("content-length", String(end - start + 1));
			const body = head ? null : file.slice(start, end + 1).stream();
			return new Response(body, { status: 206, headers });
		}
		headers.set("content-length", String(stat.size));
		return new Response(head ? null : file.stream(), { status: 200, headers });
	}

	/**
	 * Stores one uploaded file under a generated key (`prefix` + UUIDv7 +
	 * extension), keeping its content type and original filename. Limits are
	 * checked first and rejected with a 400 in the `@FormData()` error shape.
	 */
	async save(file: Blob, options: SaveFileOptions = {}): Promise<StoredFile> {
		const field = options.field ?? "file";
		const errors: FieldError[] = isChosenFile(file)
			? checkLimits(file, field, options)
			: [{ field, message: "File is required." }];
		if (errors.length > 0) throw invalid(errors);
		return this.store(file, field, options);
	}

	/**
	 * Stores every file of a `@FormData()` payload. All files are validated
	 * before any is written, blank optional inputs are skipped, and if one
	 * upload fails the ones already written are deleted again.
	 */
	async saveUploads(
		form: Pick<FormDataPayload<unknown>, "filesByField">,
		options: SaveUploadsOptions = {},
	): Promise<StoredFile[]> {
		const wanted = options.fields ? new Set(options.fields) : undefined;
		const pending: Array<{ field: string; file: File }> = [];
		const errors: FieldError[] = [];
		for (const [field, files] of Object.entries(form.filesByField)) {
			if (wanted && !wanted.has(field)) continue;
			for (const file of files) {
				if (!isChosenFile(file)) continue;
				errors.push(...checkLimits(file, field, options));
				pending.push({ field, file });
			}
		}
		if (errors.length > 0) throw invalid(errors);

		const results = await Promise.allSettled(
			pending.map(({ field, file }) => this.store(file, field, options)),
		);
		const failure = results.find((r) => r.status === "rejected");
		if (failure) {
			await Promise.allSettled(
				results.flatMap((r) =>
					r.status === "fulfilled" ? [this.delete(r.value.key)] : [],
				),
			);
			throw (failure as PromiseRejectedResult).reason;
		}
		return results.map((r) => (r as PromiseFulfilledResult<StoredFile>).value);
	}

	private async store(
		file: Blob,
		field: string,
		options: SaveOptions,
	): Promise<StoredFile> {
		const name = (file as Partial<File>).name ?? "";
		const key = options.key
			? options.key(file, field)
			: generateKey(options.prefix ?? "", name);
		const type = mediaType(file);
		const disposition = options.disposition ?? "inline";
		// the Blob is handed to Bun as it is: large files go up as a multipart
		// upload in `partSize` slices instead of one more copy in memory
		await this.write(key, file, {
			type,
			contentDisposition:
				disposition === false
					? undefined
					: contentDisposition(name, disposition),
			acl: options.acl,
			storageClass: options.storageClass,
		});
		const url = options.presign
			? this.presign(key, { expiresIn: options.presign })
			: this.publicUrl
				? this.url(key)
				: undefined;
		return { key, field, name, type, size: file.size, url };
	}

	/** Like `run`, but a missing object resolves to `null`. */
	private read<T>(
		operation: string,
		key: string,
		fn: () => Promise<T>,
	): Promise<T | null> {
		return this.run(operation, key, async () => {
			try {
				return await fn();
			} catch (error) {
				if (s3CodeOf(error) === "NoSuchKey") return null;
				throw error;
			}
		});
	}

	private run<T>(
		operation: string,
		key: string | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		return instrumentStorage(operation, this.bucket, key, async () => {
			try {
				return await fn();
			} catch (error) {
				throw StorageError.from(error, operation, key, this.bucket);
			}
		});
	}
}

function invalid(errors: FieldError[]): BadRequestException {
	return new BadRequestException({ statusCode: 400, errors });
}

function matchesEtag(header: string, etag: string): boolean {
	if (header.trim() === "*") return true;
	const bare = (tag: string) => tag.trim().replace(/^W\//, "");
	return header.split(",").some((tag) => bare(tag) === bare(etag));
}

/**
 * A single `bytes=` range, clamped to the object. A multi-range or malformed
 * header is ignored (the whole object is sent), as RFC 9110 allows.
 */
export function parseRange(
	header: string | null | undefined,
	size: number,
): [number, number] | "unsatisfiable" | undefined {
	if (!header) return undefined;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return undefined;
	const [, from = "", to = ""] = match;
	if (from === "" && to === "") return undefined;
	let start: number;
	let end: number;
	if (from === "") {
		const suffix = Number(to);
		if (suffix === 0) return "unsatisfiable";
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(from);
		end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
		if (to !== "" && Number(to) < start) return undefined;
	}
	if (start >= size || size === 0) return "unsatisfiable";
	return [start, end];
}
