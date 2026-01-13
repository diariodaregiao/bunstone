import {
  Module,
  Controller,
  Post,
  AppStartup,
  EmailService,
  EmailModule,
  Body,
} from "../../index";
import React from "react";
import { WelcomeEmail } from "./WelcomeEmail";

@Controller("email")
class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send-welcome")
  async sendWelcome(@Body() body: { email: string; name: string }) {
    await this.emailService.send({
      to: body.email,
      subject: "Bem-vindo ao Bunstone",
      component: React.createElement(WelcomeEmail, { name: body.name }),
    });

    return { success: true, message: `E-mail enviado para ${body.email}` };
  }
}

// Register the module with configuration
EmailModule.register({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "your_user",
    pass: "your_pass",
  },
  from: "noreply@bunstone.dev",
});

@Module({
  imports: [EmailModule],
  controllers: [EmailController],
})
class AppModule {}

const app = AppStartup.create(AppModule);

console.log(
  "Email adapter example configured. Note: Replace SMTP credentials to actually send."
);
