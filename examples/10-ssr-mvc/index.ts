import { AppStartup, Controller, Get, Render, Module } from "../../index";
import { Counter } from "./src/views/Counter";

@Controller("/")
class WelcomeController {
  @Get("/")
  @Render(Counter)
  index() {
    return {
      initialCount: 5,
      title: "Bunstone Auto-Hydration",
    };
  }
}

@Module({
  controllers: [WelcomeController],
})
class AppModule {}

const app = AppStartup.create(AppModule, {
  viewsDir: "examples/10-ssr-mvc/src/views"
});

app.listen(3011);
