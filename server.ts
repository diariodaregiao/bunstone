import {
  AppStartup,
  Controller,
  DELETE,
  FormData,
  GET,
  Module,
  POST,
  QUERY,
  type FormDataPayload,
  UploadAdatper,
} from "./index";

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function sanitizeFilename(filename: string): string {
  const basename = filename.replaceAll("\\", "/").split("/").pop() || "file";
  return basename.trim().replace(/\s+/g, "_");
}

function buildDatePath(prefix: string, filename: string, date: Date): string {
  const year = String(date.getFullYear());
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${prefix}/${year}/${month}/${day}/${sanitizeFilename(filename)}`;
}

@Controller()
class UploadController {
  private readonly upload = new UploadAdatper({
    endpoint: Bun.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    accessKey: Bun.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: Bun.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: Bun.env.MINIO_BUCKET ?? "dev",
  });

  @POST("/upload")
  async uploadFile(
    @FormData({ fileField: "file" }) payload: FormDataPayload,
  ): Promise<{ path: string }> {
    const file = payload.files.at(0);
    if (!file) {
      throw jsonError(400, 'Campo "file" é obrigatório.');
    }

    const key = buildDatePath("images", file.name, new Date());
    const path = await this.upload.upload({
      path: key,
      body: file,
      contentType: file.type || undefined,
    });

    return { path };
  }

  @GET("/upload/exists")
  async exists(
    @QUERY("path") path: string | null,
  ): Promise<{ exists: boolean }> {
    if (!path) {
      throw jsonError(400, 'Query param "path" é obrigatório.');
    }
    return { exists: await this.upload.exists(path) };
  }

  @DELETE("/upload")
  async remove(
    @QUERY("path") path: string | null,
  ): Promise<{ removed: boolean }> {
    if (!path) {
      throw jsonError(400, 'Query param "path" é obrigatório.');
    }
    await this.upload.remove(path);
    return { removed: true };
  }
}

@Module({
  controllers: [UploadController],
})
class AppModule {}

AppStartup.create(AppModule).listen(3000);
