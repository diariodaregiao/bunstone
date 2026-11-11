import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Param } from "@/http/params";
import { Controller, Get, SetHeader } from "@/http/routing";
import { StorageService } from "@/storage/storage.service";
import { StorageModule } from "@/storage/storage-module";
import { Test } from "@/testing/testing-module";

@Controller("files")
class FilesController {
	constructor(private readonly storage: StorageService) {}

	@Get(":name")
	@SetHeader("x-served-by", "bunstone")
	get(@Param("name") name: string) {
		return this.storage.file(`docs/${name}`);
	}
}

describe("returning an S3File from a handler", () => {
	it("redirects to a presigned URL and keeps the route's headers", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				StorageModule.register({
					endpoint: "http://storage.invalid:9000",
					accessKeyId: "key",
					secretAccessKey: "secret",
					bucket: "b",
				}),
			],
			controllers: [FilesController],
		}).compile();
		try {
			// signing is local, so no request reaches the (unreachable) endpoint
			const res = await moduleRef.createTestApp().get("/files/report.pdf");
			expect(res.status).toBe(302);
			const location = res.headers.get("location") ?? "";
			expect(location).toStartWith(
				"http://storage.invalid:9000/b/docs/report.pdf?",
			);
			expect(location).toContain("X-Amz-Signature=");
			expect(res.headers.get("x-served-by")).toBe("bunstone");
		} finally {
			await moduleRef.close();
		}
	});
});
