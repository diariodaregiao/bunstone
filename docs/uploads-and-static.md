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
interface FormDataPayload {
  fields: Record<string, string>;  // every non-file field, as text
  files: File[];                   // every file part
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
