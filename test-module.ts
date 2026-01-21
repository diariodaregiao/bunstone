import { AppStartup } from "./lib/app-startup";
import { Controller } from "./lib/controller";
import { GET } from "./lib/http-methods";
import { Module } from "./lib/module";

@Controller("c1")
export class C1 {
  @Get()
  getHello() {
    return "[C1] Hello World!";
  }
}

@Controller("c2")
export class C2 {
  @Get()
  getHello() {
    return "[C2] Hello World!";
  }
}

@Controller("c3")
export class C3 {
  @Get()
  getHello() {
    return "[C3] Hello World!";
  }
}

@Module({
  controllers: [C1],
})
export class M1 {}

@Module({
  controllers: [C2],
})
export class M2 {}

@Module({
  controllers: [C3],
})
export class M3 {}

@Module({
  imports: [M1, M2, M3],
})
export class Init {}

function bootstrap() {
  const app = await AppStartup.create(Init);
  app.listen(3000);
}
bootstrap();
