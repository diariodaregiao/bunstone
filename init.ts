import { BunstoneFactory, Controller, Get, Injectable, Module } from "./index";

@Injectable()
export class TesteService {
  execute() {
    return "service executed2";
  }
}

@Controller("/teste")
class TesteController {
  constructor(private testeService: TesteService) {}

  @Get()
  handle() {
    return this.testeService.execute();
  }
}

@Injectable()
export class TesteService2 {
  execute() {
    return "service executed";
  }
}

@Controller("/teste2")
class TesteController2 {
  constructor(private testeService: TesteService2) {}

  @Get()
  handle() {
    return this.testeService.execute();
  }
}

@Module({
  controllers: [TesteController2],
  providers: [TesteService2],
})
export class SubModule {}

@Module({
  imports: [SubModule],
  controllers: [TesteController],
  providers: [TesteService],
})
export class AppModule2 {}

async function bootstrap() {
  const app = BunstoneFactory.create(AppModule2);
  app.listen(3004);
}

bootstrap();
