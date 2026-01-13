import { Module, Controller, Get, Injectable, AppStartup } from "../../index";

@Injectable()
class AppService {
  getHello(): string {
    return "Hello from Bunstone!";
  }
}

@Controller()
class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

@Module({
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Basic app is running on http://localhost:3000");
});
