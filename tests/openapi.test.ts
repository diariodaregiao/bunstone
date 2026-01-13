import { expect, test, describe } from "bun:test";
import {
  AppStartup,
  Controller,
  Get,
  Module,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "../index";
import { z } from "zod";

const ResponseSchema = z.object({
  message: z.string(),
});

@ApiTags("TestTag")
@Controller("openapi")
class OpenApiController {
  @Get("hello")
  @ApiOperation({
    summary: "Hello World",
    description: "Returns a hello message",
  })
  @ApiResponse({ status: 200, description: "Success", type: ResponseSchema })
  hello() {
    return { message: "hello" };
  }
}

@Module({
  controllers: [OpenApiController],
})
class OpenApiTestModule {}

describe("OpenAPI Documentation", () => {
  test("should generate correct swagger json metadata", async () => {
    const app = await AppStartup.create(OpenApiTestModule, {
      swagger: {
        path: "/swagger",
      },
    });
    const elysia = (app as any).getElysia();

    const response = await elysia.handle(
      new Request("http://localhost/swagger/json")
    );
    expect(response.status).toBe(200);

    const swagger = await response.json();

    // Check tags
    expect(swagger.paths["/openapi/hello"].get.tags).toContain("TestTag");

    // Check summary and description
    expect(swagger.paths["/openapi/hello"].get.summary).toBe("Hello World");
    expect(swagger.paths["/openapi/hello"].get.description).toBe(
      "Returns a hello message"
    );

    // Check responses
    expect(swagger.paths["/openapi/hello"].get.responses["200"]).toBeDefined();
    expect(
      swagger.paths["/openapi/hello"].get.responses["200"].description
    ).toBe("Success");

    // Check if schema is present (elysia-swagger should have converted zod to json schema)
    expect(
      swagger.paths["/openapi/hello"].get.responses["200"].content[
        "application/json"
      ].schema
    ).toBeDefined();
  });
});
