# Storage (S3, R2, MinIO)

`StorageModule` stores files in object storage using **Bun's native S3 client** (`Bun.S3Client`). It works with AWS S3, Cloudflare R2, MinIO, and any other service that implements the S3 API. It has no AWS SDK and adds no npm dependency, because the client is built into Bun.

Register the module once, then inject `StorageService`.

## Setup

```ts
import { Module, StorageModule } from "@grupodiariodaregiao/bunstone";

@Module({
  imports: [
    StorageModule.register({
      bucket: "uploads",
      region: "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }),
  ],
})
export class AppModule {}
```

`StorageModule` is a **global** module, so `StorageService` is available everywhere once it is registered.

You can leave out any option. Bun then reads it from the environment: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` and `S3_SESSION_TOKEN`, or the `AWS_*` equivalents. `StorageModule.register()` with no arguments is configured entirely from the environment.

### Cloudflare R2

```ts
StorageModule.register({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  bucket: "uploads",
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  publicUrl: "https://files.example.com", // the bucket's custom domain, optional
});
```

### MinIO

```ts
StorageModule.register({
  endpoint: "http://localhost:9000",
  bucket: "uploads",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});
```

### Options

| Option | Type | Description |
|---|---|---|
| `bucket` | `string` | Bucket name |
| `endpoint` | `string` | S3 endpoint; omit for AWS |
| `region` | `string` | Region |
| `accessKeyId` / `secretAccessKey` | `string` | Credentials |
| `sessionToken` | `string` | Temporary credentials |
| `virtualHostedStyle` | `boolean` | `bucket.host/key` URLs instead of `host/bucket/key` |
| `acl` | `string` | Default ACL for writes, e.g. `"public-read"` |
| `storageClass` | `string` | Default storage class |
| `partSize` / `queueSize` / `retry` | `number` | Multipart upload tuning, passed to Bun |
| `publicUrl` | `string` | Base URL the objects are publicly served from. Enables `url(key)` |
| `name` | `string` | Registers a [named storage](#several-storages) |

## Reading and writing

```ts
import { Injectable, StorageService } from "@grupodiariodaregiao/bunstone";

@Injectable()
export class ReportsService {
  constructor(private readonly storage: StorageService) {}

  async publish(id: string, report: object) {
    await this.storage.write(`reports/${id}.json`, JSON.stringify(report), {
      type: "application/json",
    });
  }

  load(id: string) {
    return this.storage.json<{ total: number }>(`reports/${id}.json`); // null if missing
  }
}
```

`write(key, body, options?)` accepts anything `Bun.S3Client.write` does: a string, bytes (`Uint8Array`, `ArrayBuffer`), a `Blob` or `File`, a `Response`, a `BunFile`, another `S3File`, and also a `ReadableStream`. Large bodies are sent as a multipart upload. It resolves to the number of bytes written. `options` sets `type` (the content type), `contentDisposition`, `contentEncoding`, `acl` and `storageClass`.

### API

- `write(key, body, options?)`: stores an object.
- `text(key)`, `bytes(key)`, `json<T>(key)`: read an object. They resolve to **`null` when the object does not exist**.
- `file(key)`: the lazy `S3File` for a key. Nothing is fetched until you read it, for example with `.stream()`, `.slice(start, end)` or `.arrayBuffer()`.
- `exists(key)`: `true` if the object exists.
- `stat(key)`: `{ size, type, etag, lastModified }`, or `null` when missing.
- `delete(key)`: removes an object. Deleting a missing object does nothing.
- `list({ prefix?, delimiter?, limit?, cursor?, startAfter? })`: one page, as `{ objects, prefixes, cursor? }`. Pass `cursor` back to get the next page. With `delimiter: "/"`, the "folders" directly under `prefix` are returned in `prefixes`.
- `listAll(prefix?)`: an async iterator over every object under `prefix`. It fetches pages as needed.
- `presign(key, options?)`: a [presigned URL](#presigned-urls).
- `url(key)`: the public URL `publicUrl/key`.
- `serve(key, options?)`: a streamed [HTTP response](#serving-files).
- `save(file, options?)` and `saveUploads(form, options?)`: store [uploads](#uploads).
- `client`: the underlying `Bun.S3Client`.

A missing object is a normal outcome, so the reads return `null` instead of throwing. Every other failure throws a [`StorageError`](#errors). A missing **bucket** is a `StorageError`, not a `null`.

### Raw client access

`StorageService.client` is the `Bun.S3Client`. The same object is registered under the `STORAGE_CLIENT` token:

```ts
import { Inject, Injectable, STORAGE_CLIENT } from "@grupodiariodaregiao/bunstone";
import type { S3Client } from "bun";

@Injectable()
export class Exporter {
  constructor(@Inject(STORAGE_CLIENT) private readonly s3: S3Client) {}
}
```

## Uploads

`save()` and `saveUploads()` connect [`@FormData()`](./uploads-and-static.md#uploads) to storage. Each file is stored under a **generated key**: your `prefix`, a time-ordered `Bun.randomUUIDv7()`, and the file's extension (`avatars/01933c4e-….png`). The client's filename is never used to build the path, so a name like `../../etc/passwd` cannot pick where a file lands. The original filename is kept in the object's `Content-Disposition`, so a download still gets the right name. The content type is kept as well.

```ts
import {
  Controller, FormData, Get, Param, Post, Req, StorageService,
} from "@grupodiariodaregiao/bunstone";
import type { FormDataPayload } from "@grupodiariodaregiao/bunstone";

@Controller("avatars")
export class AvatarsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  async upload(
    @FormData({ files: { avatar: { required: true, accept: ["image/png", "image/jpeg"] } } })
    form: FormDataPayload,
  ) {
    const [avatar] = await this.storage.saveUploads(form, {
      prefix: "avatars/",
      maxSize: 5_000_000,                  // bytes
      accept: ["image/png", "image/jpeg"], // enforced, unlike @FormData's `accept`
    });
    return { key: avatar.key, url: `/${avatar.key}` };
  }

  @Get(":id")
  show(@Param("id") id: string, @Req() req: Request) {
    return this.storage.serve(`avatars/${id}`, { request: req });
  }
}
```

That is the whole flow. `@FormData` checks that the file is present, `saveUploads` enforces the limits and stores the file, and `serve` streams it back with its content type, ETag and `Range` support.

Each stored file is described by a `StoredFile`:

```ts
interface StoredFile {
  key: string;   // the generated object key
  field: string; // the form field it was sent under
  name: string;  // the client's filename, for display only
  type: string;  // the content type it was stored with
  size: number;
  url?: string;  // with `presign`, or when `publicUrl` is configured
}
```

### What `saveUploads` does

- It stores every file of the payload, in the order they were sent, including several files under one field. Pass `fields: ["avatar"]` to store only some fields. Call `saveUploads` once per field when the fields need different limits.
- It skips a blank optional `<input type="file">`, which browsers send as an empty part with no filename.
- It **validates every file before writing any**. A file over `maxSize`, or with a type outside `accept`, is rejected with `400` in the same shape `@FormData` uses, and nothing is stored:

  ```json
  {
    "statusCode": 400,
    "errors": [
      { "field": "avatar", "message": "File type \"application/pdf\" is not accepted; expected image/png, image/jpeg." }
    ]
  }
  ```

- If one upload fails partway, it deletes the files it already wrote and rethrows the error, so a failed request leaves no orphaned objects.

`accept` takes exact types (`"image/png"`) and wildcards (`"image/*"`). It is checked against the type the client declared for the part. That type is enough to stop mistakes, but a malicious client can declare any type, so inspect the content yourself if you need to be sure.

### Options

```ts
interface SaveUploadsOptions {
  prefix?: string;                         // e.g. "avatars/"
  fields?: string[];                       // only these form fields
  maxSize?: number;                        // bytes
  accept?: string | string[];              // "image/*", "application/pdf", ...
  presign?: number;                        // also return a presigned GET url, valid this many seconds
  disposition?: "inline" | "attachment" | false; // default "inline"
  key?: (file, field) => string;           // choose the key yourself
  acl?: string;
  storageClass?: string;
}
```

`save(file, options)` stores a single `File` or `Blob` with the same options. A blank file is rejected as `File is required.` under `options.field`, which defaults to `"file"`:

```ts
const stored = await this.storage.save(form.filesByField.cover[0], {
  field: "cover",
  prefix: "covers/",
  maxSize: 2_000_000,
});
```

### Memory

The file is passed to Bun as it is. Bun uploads anything larger than `partSize` (5 MB by default) as a multipart upload, in slices, without copying the whole file again. However, `Request.formData()` has already read the multipart body into memory by the time your handler runs. For files of hundreds of megabytes, let the browser upload directly to storage with a [presigned PUT](#presigned-urls) instead.

## Presigned URLs

A presigned URL allows one operation on one key without credentials. It is signed locally, so no request is made to the storage service.

```ts
// let the browser upload straight to the bucket
const uploadUrl = this.storage.presign(`uploads/${Bun.randomUUIDv7()}.pdf`, {
  method: "PUT",
  expiresIn: 300,              // seconds; default 3600
  type: "application/pdf",
});

// a temporary download link
const downloadUrl = this.storage.presign("reports/2026.pdf", { expiresIn: 60 });
```

The browser then calls `fetch(uploadUrl, { method: "PUT", body: file })`. The bucket's CORS configuration must allow your site's origin to do so.

## Serving files

There are three ways to send an object to a client.

**Stream it through the app** with `serve(key, options?)`. Use this for private buckets, for endpoints the client cannot reach (such as MinIO on an internal network), or when the route has its own guards:

```ts
@Get("files/:id")
@UseGuards(OwnerGuard)
download(@Param("id") id: string, @Req() req: Request) {
  return this.storage.serve(`files/${id}`, {
    request: req,           // enables Range (206), If-None-Match (304) and HEAD
    download: "report.pdf", // Content-Disposition: attachment; omit to display inline
    cacheControl: "private, max-age=300",
  });
}
```

The response carries the stored `Content-Type`, `ETag`, `Last-Modified` and `Accept-Ranges: bytes`. A single `bytes=` range is answered with `206` and fetches only that range from storage. An unsatisfiable range returns `416`, and a missing object returns `404`. Bun sends a streamed body with chunked encoding, so `Content-Length` appears on `HEAD` responses only.

**Return the `S3File`** from a handler. Bun responds with a `302` redirect to a presigned URL, so the bytes never pass through your app. The storage service then handles `Range` and caching:

```ts
@Get("avatars/:id")
avatar(@Param("id") id: string) {
  return this.storage.file(`avatars/${id}`);
}
```

Headers from `@SetHeader` and CORS are applied to the redirect. The client must be able to reach the storage endpoint.

**Link to it directly** with `url(key)` when the bucket or a CDN in front of it is public, or with `presign(key)` when it is private.

## Several storages

Pass a `name` to register more than one storage, for example two buckets or two providers. Inject a named storage with `@InjectStorage(name)`:

```ts
@Module({
  imports: [
    StorageModule.register({ bucket: "documents" }),                    // StorageService
    StorageModule.register({ name: "avatars", bucket: "avatars",
                             publicUrl: "https://avatars.example.com" }),
  ],
})
export class AppModule {}

@Injectable()
export class ProfileService {
  constructor(
    private readonly documents: StorageService,
    @InjectStorage("avatars") private readonly avatars: StorageService,
  ) {}
}
```

The named storage's tokens are `storageToken(name)` for the service and `storageClientToken(name)` for the raw client, so you can also use `app.resolve(storageToken("avatars"))`.

## Errors

Every failure other than a missing object is a `StorageError`. The S3 code the service reported is in `context.s3Code`, and the original error is in `cause`.

| Code | Meaning |
|---|---|
| `BNS-STG-001` | The request failed for another reason (see `context.s3Code`) |
| `BNS-STG-002` | Access denied: wrong credentials, or the key lacks permission |
| `BNS-STG-003` | The bucket does not exist |
| `BNS-STG-004` | The endpoint is unreachable |
| `BNS-STG-005` | Invalid configuration: missing credentials, an empty key, or `url()` without `publicUrl` |

```ts
import { StorageError } from "@grupodiariodaregiao/bunstone";

try {
  await this.storage.write(key, body);
} catch (error) {
  if (error instanceof StorageError && error.code === "BNS-STG-004") {
    // storage is down: queue the upload for later
  }
  throw error;
}
```

An upload rejected by `maxSize` or `accept` is not a `StorageError`. It is a `BadRequestException` with a `400` response, as described in [Uploads](#uploads).

## Observability

When [`TelemetryModule`](./observability.md) is registered, every operation produces a `storage {operation}` span (`storage write`, `storage read`, `storage list`, …) with `storage.bucket` and `storage.key` attributes. It also records a `storage.operation.duration` histogram by operation and outcome. Without the module these cost nothing.

## What goes into the bundle

Storage is built on `Bun.S3Client`, so it adds no package to your bundle. An app that does not import `StorageModule` bundles none of its code. An app that does pays about 10 KB.
