# Upload adapter (MinIO/S3)

The `UploadAdapter` is a small abstraction on top of Bun's native S3 client, focused on:

- Upload a file to a bucket
- Check if an object exists
- Remove an object

## Import

```ts
import { UploadAdapter } from "@grupodiariodaregiao/bunstone";
```

## Setup (MinIO)

```ts
const upload = new UploadAdapter({
  endpoint: "http://localhost:9000",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  bucket: "my-bucket",
});
```

## Upload

`upload()` returns the full bucket path, always starting with `/`.

```ts
const path = await upload.upload({
  path: "images/2025/12/31/image.avif",
  body: file, // File | Blob | Response | Buffer | ...
  contentType: "image/avif",
});

// path === "/images/2025/12/31/image.avif"
```

## Exists / Remove

```ts
const exists = await upload.exists("/images/2025/12/31/image.avif");
await upload.remove("/images/2025/12/31/image.avif");
```
