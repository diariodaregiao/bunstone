import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  AppStartup,
  SqlModule,
  SqlService,
} from "../../index";

@Controller("users")
class UserController {
  constructor(private readonly sql: SqlService) {}

  @Get()
  async getUsers() {
    // Example query using SqlService (requires a running database)
    // return await this.sql.query('SELECT * FROM users');
    return [{ id: 1, name: "Database User" }];
  }

  @Post()
  async createUser(@Body() body: { name: string }) {
    // Example insertion
    // await this.sql.query('INSERT INTO users (name) VALUES (?)', [body.name]);
    return { success: true, user: body.name };
  }
}

@Module({
  imports: [
    SqlModule.register({
      provider: "postgresql",
      host: "localhost",
      port: 5432,
      username: "user",
      password: "password",
      database: "mydb",
    }),
  ],
  controllers: [UserController],
})
class AppModule {}

const app = await AppStartup.create(AppModule);
// app.listen(3000); // Commented out to prevent actual startup without DB
console.log("SQL Database example configured.");
