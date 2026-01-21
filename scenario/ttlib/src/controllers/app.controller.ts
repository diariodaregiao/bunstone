import { Controller, Get, Render } from "@grupodiariodaregiao/bunstone";
import { AppService } from "@/services/app.service";
import { Welcome } from "@/views/Welcome";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render(Welcome)
  getHello() {
    return this.appService.getHello();
  }
}
