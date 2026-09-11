import "reflect-metadata";
import { Application } from "../index.ts";
import { UsersModule } from "./users.module.ts";

const app = await Application.create(UsersModule, {
  cors: {
      origin: "*",
    },
    openapi: {
      info: {
        title: "Users API",
        description: "API de usuários",
        version: "1.0.0",
      },
      ui: true,
      uiPath: "/docs",
      path: "/openapi.json",
      bearer: true,
    },
});
app.listen(3007);
