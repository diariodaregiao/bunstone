import {
  Module,
  Controller,
  Get,
  Jwt,
  Guard,
  AppStartup,
  JwtModule,
} from "../../index";
import type { HttpRequest } from "../../lib/types/http-request";
import type { GuardContract } from "../../lib/interfaces/guard-contract";

class RoleGuard implements GuardContract {
  async validate(req: HttpRequest): Promise<boolean> {
    const role = req.headers["x-role"];
    return role === "admin";
  }
}

@Controller("admin")
class AdminController {
  @Get("secret")
  @Jwt() // Checks for Authorization: Bearer <token>
  @Guard(RoleGuard) // Custom check for x-role: admin
  getSecret() {
    return {
      message: "This is a secret area only for admins with valid JWT!",
    };
  }

  @Get("public")
  getPublic() {
    return { message: "This is public" };
  }
}

@Module({
  imports: [
    JwtModule.register({
      name: "jwt",
      secret: "super-secret-key",
    }),
  ],
  controllers: [AdminController],
})
class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Guards example is running on http://localhost:3000");
});
