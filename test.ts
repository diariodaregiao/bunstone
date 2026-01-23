import jwt from "@elysiajs/jwt";
import { FormData } from "./lib/adapters/form-data";
import { AppStartup } from "./lib/app-startup";
import { Controller } from "./lib/controller";
import { Guard } from "./lib/guard";
import { Get, Post } from "./lib/http-methods";
import { Body, Param, Query, type FormDataPayload } from "./lib/http-params";
import { Jwt } from "./lib/jwt";
import { JwtModule } from "./lib/jwt/jwt-module";
import { Module } from "./lib/module";
import { Injectable } from "./lib/injectable";
import z from "zod/v4";
import type { GuardContract } from "./lib/interfaces/guard-contract";
import type { HttpRequest } from "./lib/types/http-request";
import { Render } from "./lib/render";
import { WelcomePage } from "./test-jsx";

export class TestGuard implements GuardContract {
  validate(req: HttpRequest): boolean | Promise<boolean> {
    // Implement your guard logic here
    return true;
  }
}

const userSchema = z.object({
  name: z.string().min(50, { error: "Nome deve ter pelo menos 50 caracteres" }),
  email: z.email({ error: "Email inválido" }),
});

@Controller("test")
export class TestController {
  // @Guard(TestGuard)
  // @Get("hello")
  @Get("hello")
  hello() {
    return "Hello executed";
  }

  @Get("world")
  world() {
    return "World executed";
  }

  @Post("foo/bar")
  async fooBar(@Body(userSchema) input: any) {
    return input;
  }
}

@Controller("upload")
export class Test2Controller {
  @Post()
  upload(@Body() input: any) {
    console.log("input", input);
  }

  @Post("test")
  async test(
    @FormData({
      allowedTypes: ["image/png", "image/jpg"],
      fileField: "images",
      jsonField: "name",
    })
    input: FormDataPayload
  ) {
    console.log("input", input);
  }
}

@Controller("users")
export class Users {
  private users = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
  }));

  @Get()
  async getUsers(@Query("id") query: any) {
    console.log("query", query);
    return this.users;
  }

  @Get(":id")
  async execute(@Param("id") input: any) {
    const user = this.users.find((user) => user.id === Number(input));

    return user;
  }
}

@Controller("auth")
@Jwt()
export class TestAuth {
  @Get("login")
  async execute() {
    const auth = jwt({ secret: "supersecretkey", alg: "HS256" });
    const token = await auth.decorator.jwt.sign({ userId: 1 });
    return { token };
  }

  @Get("profile")
  profile(foo: any) {
    return { message: "user profile" };
  }
}

@Injectable()
export class ProductService {
  constructor() {}

  getProducts() {
    console.log("getting products..!! 🍊🍊🍊");
  }
}

@Injectable()
export class EmailService {
  constructor() {}

  sendEmail() {
    console.log("sending email..!! 📧📧📧");
  }
}

@Injectable()
export class OrderService {
  constructor(
    private productService: ProductService,
    private emailService: EmailService
  ) {}

  getOrders() {
    console.log("getting orders..!! 📦📦📦");
    this.productService.getProducts();
    this.emailService.sendEmail();
  }
}

@Injectable()
export class TesteService {
  sayHello(name: string): string {
    return `Hello, ${name}!`;
  }
}

@Controller()
export class OrderController {
  constructor(
    private orderService: OrderService,
    private testeService: TesteService
  ) {}

  @Get("orders")
  fetchOrders() {
    const result = this.testeService.sayHello("Filipi");
    this.orderService.getOrders();
    return { message: "Orders fetched", result };
  }
}

@Controller()
export class TController {
  constructor(
    private orderService: OrderService,
    private testeService: TesteService
  ) {}

  @Get("teste")
  fetchOrders() {
    return this.testeService.sayHello("Filipi");
  }
}

@Controller("ssr")
class SsrController {
  @Get()
  @Render(WelcomePage)
  index() {
    // This returns the "Model" which will be passed as props to the component
    return {
      name: "Developer",
      items: [
        "Native TSX support with Bun",
        "@Render decorator for MVC style views",
        "Elysia HTML plugin integration",
        "Default TailwindCSS Layout",
      ],
    };
  }
}

@Module({
  controllers: [SsrController],
})
class SsrModule {}

@Module({
  imports: [
    JwtModule.register({
      secret: "supersecretkey",
    }),
    SsrModule,
  ],
  controllers: [
    TestController,
    Test2Controller,
    Users,
    TestAuth,
    OrderController,
  ],
  providers: [ProductService, EmailService, OrderService, TesteService],
})
export class AppModule {}

async function bootstrap() {
  const app = await AppStartup.create(AppModule, {
    swagger: {
      path: "/docs",
      documentation: {
        info: {
          title: "Diario DIP API",
          version: "1.0.0",
          description: "API documentation for Diario DIP application",
        },
      },
    },
  });

  app.listen(3000);
}

bootstrap();
