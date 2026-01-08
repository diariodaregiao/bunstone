import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  AppStartup,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "../../index";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

@ApiTags("Users")
@Controller("users")
class UserController {
  @Get()
  @ApiOperation({ summary: "List all users" })
  @ApiResponse({ status: 200, description: "Return all users" })
  getUsers() {
    return [];
  }

  @Post()
  @ApiOperation({ summary: "Create a user" })
  @ApiResponse({ status: 201, description: "User created" })
  createUser(@Body(UserSchema) body: z.infer<typeof UserSchema>) {
    return body;
  }
}

@Module({
  controllers: [UserController],
})
class AppModule {}

const app = AppStartup.create(AppModule, {
  swagger: {
    path: "/docs",
    title: "Bunstone API",
    version: "1.0.0",
  },
});

app.listen(3000, () => {
  console.log("OpenAPI (Swagger) is available at http://localhost:3000/docs");
});
