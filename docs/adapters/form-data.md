# FormData adapter

Use the `@FormData()` parameter decorator to extract multipart payloads into a typed object. It works on handler parameters inside controllers.

## Import

```ts
import { FormData, type FormDataPayload } from "@bunstone";
```

## Usage

```ts
class UploadController {
  @Post("/upload")
  upload(
    @FormData({
      fileField: "files", // optional: specific field to read files from
      allowedTypes: ["image/avif"], // optional: mime or extensions allowed
      jsonField: "meta", // optional: parse this field as JSON
    })
    payload: FormDataPayload
  ) {
    // payload.files: File[]
    // payload.json: parsed JSON from jsonField, if provided
  }
}
```

## Options

- `fileField` (string): Only read files from this field. Defaults to all file values in the form.
- `allowedTypes` (string[]): Allowed MIME types or extensions. Rejects others with a bad request.
- `jsonField` (string): Field name to parse as JSON. Rejects non-string or invalid JSON.

## Payload shape

```ts
type FormDataPayload = {
  files: File[];
  json?: unknown;
};
```

## Practical Example

Explore form-data handling with multiple fields:

<<< @/../examples/07-adapters/index.ts

[See it on GitHub](https://github.com/diariodaregiao/bunstone/blob/main/examples/07-adapters/index.ts)
