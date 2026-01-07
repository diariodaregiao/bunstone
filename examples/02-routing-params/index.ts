import {
  Module,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  AppStartup,
} from "../../index";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().optional(),
});

@Controller("users")
class UserController {
  @Post()
  createUser(@Body(CreateUserSchema) body: z.infer<typeof CreateUserSchema>) {
    return {
      message: "User created successfully",
      user: body,
    };
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return { id, name: "John Doe" };
  }

  @Get()
  searchUsers(@Query("name") name: string) {
    return {
      query: name,
      results: [
        { id: "1", name: "John Doe" },
        { id: "2", name: "Jane Doe" },
      ].filter((u) =>
        u.name.toLowerCase().includes((name || "").toLowerCase())
      ),
    };
  }
}

@Module({
  controllers: [UserController],
})
class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("Routing example is running on http://localhost:3000");
});
