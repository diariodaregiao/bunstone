import { expect, test, describe } from "bun:test";
import { AppStartup, Controller, Get, Module, Render } from "../index";
import React from "react";

const MyView = ({ title, name }: { title: string; name: string }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>Hello, {name}!</p>
    </div>
  );
};

@Controller("ssr")
class SsrController {
  @Get("render")
  @Render(MyView)
  renderMethod() {
    return { title: "SSR Test", name: "World" };
  }

  @Get("jsx")
  jsxMethod() {
    return (
      <div id="direct-jsx">
        <span>Direct JSX Response</span>
      </div>
    );
  }
}

@Module({
  controllers: [SsrController],
})
class SsrTestModule {}

describe("SSR and MVC", () => {
  test("should render component with @Render", async () => {
    const app = await AppStartup.create(SsrTestModule);
    const elysia = (app as any).getElysia();

    const response = await elysia.handle(
      new Request("http://localhost/ssr/render")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<h1>SSR Test</h1>");
    expect(html).toContain("Hello,");
    expect(html).toContain("World");
    expect(html).toContain("!");
    expect(html).toContain('id="__BUNSTONE_DATA__"');
    expect(html).toContain('{"title":"SSR Test","name":"World"}');
  });

  test("should render direct JSX response", async () => {
    const app = await AppStartup.create(SsrTestModule);
    const elysia = (app as any).getElysia();

    const response = await elysia.handle(
      new Request("http://localhost/ssr/jsx")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain('<div id="direct-jsx">');
    expect(html).toContain("<span>Direct JSX Response</span>");
  });
});
