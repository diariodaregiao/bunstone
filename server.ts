import "reflect-metadata";
import { AppStartup } from "./lib/app-startup";
import { Module } from "./lib/module";
import { UploadAdatper } from "./lib/adapters/upload-adapter";

@Module({
  providers: [UploadAdatper],
})
export class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000);
