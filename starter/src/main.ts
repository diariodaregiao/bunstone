import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "@/app.module";

async function bootstrap() {
  const app = await AppStartup.create(AppModule, {
    viewsDir: "src/views",
  });
  app.listen(3000);
}
bootstrap();
