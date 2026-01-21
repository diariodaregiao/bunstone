import "reflect-metadata";
import { AppStartup } from "@grupodiariodaregiao/bunstone";
import { AppModule } from "@/app.module";

const app = await AppStartup.create(AppModule, {
  viewsDir: "src/views",
});

app.listen(3000);
