import { Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "@/controllers/app.controller";
import { AppService } from "@/services/app.service";

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
