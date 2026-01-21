import { WelcomeEmail } from "@/templates/welcome-email";
import {
  Controller,
  EmailService,
  Get,
  Post,
} from "@grupodiariodaregiao/bunstone";

@Controller("users")
export class UserController {
  constructor(private readonly emailService: EmailService) {}

  @Get("register")
  async register() {
    // ... lógica de registro

    await this.emailService.send({
      to: "filipi.youssef1@gmail.com",
      subject: "Bem-vindo!",
      component: <WelcomeEmail name="Filipi" />,
    });

    return { success: true };
  }
}
