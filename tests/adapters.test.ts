import { expect, test, describe, spyOn } from "bun:test";
import { CacheAdapter, AppStartup, Controller, Post, Module } from "../index";
import { FormData } from "../lib/adapters/form-data";
import { redis, s3 } from "bun";

describe("Adapters", () => {
  describe("CacheAdapter", () => {
    test("should set and get values", async () => {
      // Mock bun redis
      const mockStorage = new Map();
      spyOn(redis, "set").mockImplementation(
        async (key: string, value: string) => {
          mockStorage.set(key, value);
        }
      );
      spyOn(redis, "get").mockImplementation(async (key: string) => {
        return mockStorage.get(key) || null;
      });

      const adapter = new CacheAdapter();
      await adapter.set("test-key", { hello: "world" });
      const value = await adapter.get("test-key");

      expect(value).toEqual({ hello: "world" });
    });
  });

  describe("FormData Adapter", () => {
    @Controller("upload")
    class UploadController {
      @Post("form")
      handleUpload(@FormData() data: any) {
        return {
          filesCount: data.files.length,
          fileName: data.files[0]?.name,
        };
      }
    }

    @Module({
      controllers: [UploadController],
    })
    class UploadModule {}

    test("should parse multipart form data", async () => {
      const app = AppStartup.create(UploadModule);
      const elysia = (app as any).getElysia();

      const formData = new (globalThis as any).FormData();
      formData.append(
        "file",
        new File(["content"], "test.txt", { type: "text/plain" })
      );

      const response = await elysia.handle(
        new Request("http://localhost/upload/form", {
          method: "POST",
          body: formData,
        })
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.filesCount).toBe(1);
      expect(result.fileName).toBe("test.txt");
    });
  });
});
