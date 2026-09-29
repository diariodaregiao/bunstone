# File uploads & static files

## Uploads

`@FormData()` parses a `multipart/form-data` request into text fields and files. The files are standard web `File` objects, so Bun's file APIs work on them directly.

```ts
import { Controller, FormData, Post } from "@grupodiariodaregiao/bunstone";
import type { FormDataPayload } from "@grupodiariodaregiao/bunstone";

@Controller("uploads")
export class UploadsController {
  @Post()
  async upload(@FormData() form: FormDataPayload) {
    for (const file of form.files) {
      await Bun.write(`./storage/${file.name}`, file);
    }
    return { title: form.fields.title, count: form.files.length };
  }
}
```

```ts
interface FormDataPayload<TFields = Record<string, string>> {
  fields: TFields;                      // every non-file field, as text (or the parsed `fields` schema)
  files: File[];                        // every file part, in the order it was sent
  filesByField: Record<string, File[]>; // the same files, grouped by form field name
}
```

A request that is not valid multipart is rejected with `400 Expected multipart form data.` before your handler runs.

Each `File` carries `name`, `type` and `size`, so you can enforce your own limits:

```ts
@Post()
async upload(@FormData() form: FormDataPayload) {
  const [file] = form.files;
  if (!file) throw new BadRequestException("A file is required.");
  if (file.size > 5_000_000) throw new BadRequestException("File too large.");
  if (!file.type.startsWith("image/")) {
    throw new UnprocessableEntityException("Only images are accepted.");
  }
  await Bun.write(`./storage/${crypto.randomUUID()}`, file);
  return { ok: true };
}
```

### Declaring fields and files

`@FormData()` also accepts options that describe the form. They validate the request and generate the [OpenAPI documentation](./openapi.md#file-uploads-multipartform-data), which gives Swagger UI a file picker for each file field.

```ts
import { z } from "zod";
import type { InferFormData } from "@grupodiariodaregiao/bunstone";

const Upload = z.object({
  title: z.string().min(1),
  public: z.stringbool().default(false),
});

@Post()
async upload(
  @FormData({
    fields: Upload,
    files: {
      cover: { required: true, accept: ["image/png", "image/jpeg"] },
      attachments: { multiple: true },
    },
  })
  form: InferFormData<typeof Upload>,
) {
  const [cover] = form.filesByField.cover;       // guaranteed by `required`
  const attachments = form.filesByField.attachments ?? [];
  return { title: form.fields.title, cover: cover.name, attachments: attachments.length };
}
```

- `fields` is a Zod schema run against the text fields. The handler receives the parsed result, typed by `InferFormData<typeof Schema>`. Fields are text, so use `z.coerce.number()` or `z.stringbool()` for other types.
- `files` declares the file fields by name. `required: true` rejects a request that sends no file under that name. A blank file input, which browsers send as an empty part with no filename, counts as missing.
- `multiple`, `description` and `accept` only affect the OpenAPI document. `accept` does **not** check the uploaded file's type, so check `file.type` yourself, as in the example above.

Field and file errors are reported together, in the same shape `@Body(schema)` uses:

```json
{
  "statusCode": 400,
  "errors": [
    { "field": "cover", "message": "File is required." },
    { "field": "title", "message": "Too small: expected string to have >=1 characters" }
  ]
}
```

## Static files

Serve a directory from disk with the `static` option:

```ts
const app = await Application.create(AppModule, {
  static: { dir: "./public", prefix: "/public" },
});
```

- `dir` — the directory to serve, resolved from the process working directory. Default `public`.
- `prefix` — the URL prefix it is mounted on. Default `/public`.

`GET /public/logo.png` serves `./public/logo.png`. A missing file is `404`; a malformed percent-escape is `400`.

Static files are resolved **after** your controllers, so a route always wins over a file on the same path.

### Path traversal

Requests that try to escape the served directory are rejected with `403`, including encoded variants:

```
/public/../secret.txt      → 403
/public/..%2fsecret.txt    → 403
/public/%2e%2e/secret.txt  → 403
/public/sub/../../etc      → 403
```

The check resolves the final absolute path and requires it to sit inside the served directory, so it holds regardless of how the traversal is spelled.

## Request state

Guards and handlers share a per-request `state` object, which is how a guard passes data to the handler it protected. `@State()` reads it.

```ts
@Injectable()
export class TenantGuard implements GuardContract {
  canActivate(ctx: RequestContext): boolean {
    const tenant = ctx.headers.get("x-tenant");
    if (!tenant) return false;
    ctx.state.tenant = tenant;
    return true;
  }
}

@Controller("reports")
export class ReportsController {
  @Get()
  @UseGuards(TenantGuard)
  list(@State("tenant") tenant: string) {
    return { tenant };
  }
}
```

`@State()` without a key returns the whole state object. State is allocated fresh per request and never shared between them. `@Jwt()` uses exactly this mechanism — it stores the verified payload on `ctx.state.jwt`, which is what `@JwtPayload()` reads.
