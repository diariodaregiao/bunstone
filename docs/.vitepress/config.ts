import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bunstone",
  description: "A decorator-based framework for Bun and Elysia",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/getting-started" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/getting-started" },
          { text: "Dependency Injection", link: "/dependency-injection" },
        ],
      },
      {
        text: "Features",
        items: [
          { text: "Routing & Params", link: "/routing-params" },
          { text: "MVC & SSR (React)", link: "/mvc-ssr" },
          { text: "Guards & JWT", link: "/guards-jwt" },
          { text: "CQRS", link: "/cqrs" },
          { text: "Scheduling", link: "/scheduling" },
          { text: "Database (SQL)", link: "/database-sql" },
          { text: "OpenAPI (Swagger)", link: "/openapi" },
          { text: "Testing", link: "/testing" },
        ],
      },
      {
        text: "Adapters",
        items: [
          { text: "Cache (Redis)", link: "/adapters/cache-adapter" },
          { text: "Email Service", link: "/adapters/email-adapter" },
          { text: "Form Data", link: "/adapters/form-data" },
          { text: "Upload Adapter", link: "/adapters/upload-adapter" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/diariodaregiao/bunstone",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024-present Grupo Diário da Região",
    },
  },
});
