import "reflect-metadata";
import { Module, Controller, Get, AppStartup, Query } from "./index";
import { z } from "zod";

const SearchSchema = z.object({ q: z.string() });

@Controller("test")
class QueryController {
  @Get("search")
  search(@Query(SearchSchema) query: z.infer<typeof SearchSchema>) {
    return query;
  }
}

@Module({ controllers: [QueryController] })
class QueryModule {}

async function main() {
  const app = await AppStartup.create(QueryModule);
  const elysia = (app as any).getElysia();
  const response = await elysia.handle(
    new Request("http://localhost/test/search?q=hello")
  );
  console.log("status", response.status);
  console.log(await response.json());
}

main();
