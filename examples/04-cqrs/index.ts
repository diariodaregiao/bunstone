import {
  Module,
  Controller,
  Post,
  Body,
  AppStartup,
  CqrsModule,
  CommandBus,
  CommandHandler,
} from "../../index";

// 1. Define a Command
class CreateUserCommand {
  constructor(public readonly name: string) {}
}

// 2. Define a Command Handler
@CommandHandler(CreateUserCommand)
class CreateUserHandler {
  async execute(command: CreateUserCommand) {
    console.log(`Executing CreateUserCommand for name: ${command.name}`);
    return { id: "123", name: command.name };
  }
}

@Controller("users")
class UserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createUser(@Body() body: { name: string }) {
    // 3. Dispatch the command via the Bus
    return await this.commandBus.execute(new CreateUserCommand(body.name));
  }
}

@Module({
  imports: [CqrsModule],
  controllers: [UserController],
  providers: [CreateUserHandler],
})
class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000, () => {
  console.log("CQRS example is running on http://localhost:3000");
});
