import {
  Module,
  Controller,
  Post,
  Get,
  AppStartup,
  CacheAdapter,
  FormData,
} from "../../index";

@Controller("cache")
class CacheController {
  constructor(private readonly cache: CacheAdapter) {}

  @Get(":key")
  async getCache(key: string) {
    const value = await this.cache.get(key);
    return { key, value };
  }

  @Post(":key")
  async setCache(key: string, @Body() body: any) {
    await this.cache.set(key, body, { ttlSeconds: 60 });
    return { success: true };
  }
}

@Controller("upload")
class UploadController {
  @Post()
  async uploadFile(@FormData() formData: any) {
    // Access form fields and files
    const { fields, files } = formData;
    return {
      receivedFields: Object.keys(fields),
      receivedFiles: Object.keys(files),
    };
  }
}

@Module({
  controllers: [CacheController, UploadController],
  providers: [CacheAdapter],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
console.log("Adapters example configured.");
