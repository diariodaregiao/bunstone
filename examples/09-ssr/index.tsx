import React from "react";
import {
  Module,
  Controller,
  Get,
  AppStartup,
  Render,
  Layout,
} from "../../index";

// A simple React component for our Page
const WelcomePage: React.FC<{ name: string; items: string[] }> = ({
  name,
  items,
}) => {
  return (
    <Layout title="Welcome to Bunstone SSR">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Hello, {name}!
        </h1>
        <p className="text-gray-600 mb-6">
          This page was rendered on the server using React and Bun.
        </p>

        <h2 className="text-xl font-semibold mb-2">Features implemented:</h2>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-gray-700">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/" className="text-blue-500 hover:text-blue-700 font-medium">
            &larr; Back to home
          </a>
        </div>
      </div>
    </Layout>
  );
};

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

  @Get("direct")
  direct() {
    // You can still return JSX directly if you don't want to use @Render
    return (
      <Layout title="Direct JSX">
        <div className="p-10 text-center">
          <h1 className="text-4xl font-black">Direct JSX Return</h1>
          <p className="mt-4">
            Sometimes you just want to return a component directly.
          </p>
        </div>
      </Layout>
    );
  }
}

@Module({
  controllers: [SsrController],
})
class SsrModule {}

const app = AppStartup.create(SsrModule);
// We use a different port from the basic example
const port = 3009;
app.listen(port);
console.log(`SSR example running on http://localhost:${port}/ssr`);
console.log(
  `Direct JSX example running on http://localhost:${port}/ssr/direct`
);
