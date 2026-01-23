import { EmailModule, Module } from "@grupodiariodaregiao/bunstone";
import { AppController } from "@/controllers/app.controller";
import { AppService } from "@/services/app.service";
import { UserController } from "./controllers/send-email.controller";

@Module({
  imports: [
    EmailModule.register({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "contato@barbershop-agenda.com.br",
        pass: "Tea48057994-7",
      },
      from: '"BarberShop Agenda" <contato@barbershop-agenda.com.br>',
    }),
  ],
  controllers: [UserController],
  providers: [AppService],
})
export class AppModule {}
