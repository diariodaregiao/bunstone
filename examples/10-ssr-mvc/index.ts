import { AppStartup, Controller, Get, Render, Module } from "../../index";
import { Counter } from "./src/views/Counter";
import { HooksDemo } from "./src/views/HooksDemo";

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

  @Get("/hooks")
  @Render(HooksDemo)
  hooksDemo() {
    return {
      initialMessage: "Hello from Server - useEffect will update this!",
      title: "React Hooks Demo",
    };
  }
}

@Module({
  controllers: [WelcomeController],
})
class AppModule {}

const app = await AppStartup.create(AppModule, {
  viewsDir: "examples/10-ssr-mvc/src/views",
});

app.listen(3011);
