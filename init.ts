import {
  Application,
  Injectable,
  Module
} from "./index.ts";

@Injectable()
export class AppService {
  
  
  async handleCron() {
    console.log('Cron job executed');
  }
}



@Module({
  providers: [AppService],
})
export class AppModule {}


const app = await Application.create(AppModule,{ openapi: {
    info: { title: "My API", version: "1.0.0" },
    ui: true,
    auth: {
      username: process.env.DOCS_USER ?? "admin",
      password: process.env.DOCS_PASSWORD ?? "secret",
    },
  },
});
app.listen(3050)
