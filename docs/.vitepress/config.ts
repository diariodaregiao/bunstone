import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type DefaultTheme } from "vitepress";

type DocSourceMap = Record<string, string>;

type ExtendedThemeConfig = DefaultTheme.Config & {
  docSources: DocSourceMap;
  copyPageButton: {
    idle: string;
    success: string;
    unavailable: string;
    error: string;
  };
};

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walkMarkdownFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".vitepress" || entry.name === "pt-BR") {
        return [];
      }

      return walkMarkdownFiles(absolutePath);
    }

    return entry.name.endsWith(".md") ? [absolutePath] : [];
  });
}

function toRoutePath(relativeFilePath: string, localePrefix = ""): string {
  let route = relativeFilePath.replace(/\\/g, "/").replace(/\.md$/, "");

  if (route === "index") {
    return localePrefix || "/";
  }

  if (route.endsWith("/index")) {
    route = route.slice(0, -"/index".length);
  }

  return `${localePrefix}/${route}`.replace(/\/+/g, "/");
}

function buildDocSourceMap(sourceDir: string, localePrefix = ""): DocSourceMap {
  return Object.fromEntries(
    walkMarkdownFiles(sourceDir).map((absolutePath) => {
      const relativePath = path.relative(sourceDir, absolutePath);
      return [
        toRoutePath(relativePath, localePrefix),
        readFileSync(absolutePath, "utf8"),
      ];
    }),
  );
}

function withPrefix(prefix: string, link: string): string {
  if (prefix === "/") {
    return link;
  }

  return link === "/" ? prefix : `${prefix}${link}`;
}

function createThemeConfig(prefix: string, labels: {
  home: string;
  guide: string;
  introduction: string;
  gettingStarted: string;
  applicationRuntime: string;
  cli: string;
  logging: string;
  dependencyInjection: string;
  features: string;
  routingParams: string;
  rateLimiting: string;
  databaseSql: string;
  testing: string;
  adapters: string;
  emailService: string;
  formData: string;
  uploadAdapter: string;
  footerMessage: string;
  copyIdle: string;
  copySuccess: string;
  copyUnavailable: string;
  copyError: string;
}): ExtendedThemeConfig {
  return {
    nav: [
      { text: labels.home, link: withPrefix(prefix, "/") },
      { text: labels.guide, link: withPrefix(prefix, "/getting-started") },
    ],
    sidebar: [
      {
        text: labels.introduction,
        items: [
          {
            text: labels.gettingStarted,
            link: withPrefix(prefix, "/getting-started"),
          },
          {
            text: labels.applicationRuntime,
            link: withPrefix(prefix, "/application-runtime"),
          },
          {
            text: labels.cli,
            link: withPrefix(prefix, "/cli"),
          },
          {
            text: labels.logging,
            link: withPrefix(prefix, "/logging"),
          },
          {
            text: labels.dependencyInjection,
            link: withPrefix(prefix, "/dependency-injection"),
          },
        ],
      },
      {
        text: labels.features,
        items: [
          { text: "OnModuleInit", link: withPrefix(prefix, "/on-module-init") },
          {
            text: "OnModuleDestroy",
            link: withPrefix(prefix, "/on-module-destroy"),
          },
          {
            text: labels.routingParams,
            link: withPrefix(prefix, "/routing-params"),
          },
          { text: "MVC & SSR (React)", link: withPrefix(prefix, "/mvc-ssr") },
          { text: "Guards & JWT", link: withPrefix(prefix, "/guards-jwt") },
          {
            text: labels.rateLimiting,
            link: withPrefix(prefix, "/rate-limiting"),
          },
          { text: "CQRS", link: withPrefix(prefix, "/cqrs") },
          { text: "Scheduling", link: withPrefix(prefix, "/scheduling") },
          { text: "BullMQ (Queues)", link: withPrefix(prefix, "/bullmq") },
          { text: "RabbitMQ", link: withPrefix(prefix, "/rabbitmq") },
          {
            text: labels.databaseSql,
            link: withPrefix(prefix, "/database-sql"),
          },
          { text: "OpenAPI (Swagger)", link: withPrefix(prefix, "/openapi") },
          { text: labels.testing, link: withPrefix(prefix, "/testing") },
        ],
      },
      {
        text: labels.adapters,
        items: [
          {
            text: "Cache (Redis)",
            link: withPrefix(prefix, "/adapters/cache-adapter"),
          },
          {
            text: labels.emailService,
            link: withPrefix(prefix, "/adapters/email-adapter"),
          },
          {
            text: labels.formData,
            link: withPrefix(prefix, "/adapters/form-data"),
          },
          {
            text: labels.uploadAdapter,
            link: withPrefix(prefix, "/adapters/upload-adapter"),
          },
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
      message: labels.footerMessage,
      copyright: "Copyright © 2024-present Grupo Diário da Região",
    },
    docSources: {
      ...buildDocSourceMap(docsRoot),
      ...buildDocSourceMap(path.join(docsRoot, "pt-BR"), "/pt-BR"),
    },
    copyPageButton: {
      idle: labels.copyIdle,
      success: labels.copySuccess,
      unavailable: labels.copyUnavailable,
      error: labels.copyError,
    },
  };
}

export default defineConfig({
  title: "Bunstone",
  description: "A decorator-based framework for Bun and Elysia",
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      themeConfig: createThemeConfig("/", {
        home: "Home",
        guide: "Guide",
        introduction: "Introduction",
        gettingStarted: "Getting Started",
        applicationRuntime: "Application Runtime",
        cli: "CLI",
        logging: "Logging",
        dependencyInjection: "Dependency Injection",
        features: "Features",
        routingParams: "Routing & Params",
        rateLimiting: "Rate Limiting",
        databaseSql: "Database (SQL)",
        testing: "Testing",
        adapters: "Adapters",
        emailService: "Email Service",
        formData: "Form Data",
        uploadAdapter: "Upload Adapter",
        footerMessage: "Released under the MIT License.",
        copyIdle: "Copy page",
        copySuccess: "Page copied",
        copyUnavailable: "MD unavailable",
        copyError: "Copy failed",
      }),
    },
    "pt-BR": {
      label: "Português (Brasil)",
      lang: "pt-BR",
      link: "/pt-BR/",
      themeConfig: createThemeConfig("/pt-BR", {
        home: "Início",
        guide: "Guia",
        introduction: "Introdução",
        gettingStarted: "Primeiros Passos",
        applicationRuntime: "Runtime da Aplicação",
        cli: "CLI",
        logging: "Logging",
        dependencyInjection: "Injeção de Dependência",
        features: "Recursos",
        routingParams: "Roteamento & Parâmetros",
        rateLimiting: "Rate Limiting",
        databaseSql: "Banco de Dados (SQL)",
        testing: "Testes",
        adapters: "Adaptadores",
        emailService: "Serviço de E-mail",
        formData: "Form Data",
        uploadAdapter: "Adaptador de Upload",
        footerMessage: "Distribuído sob a Licença MIT.",
        copyIdle: "Copiar página",
        copySuccess: "Página copiada",
        copyUnavailable: "MD indisponível",
        copyError: "Falha ao copiar",
      }),
    },
  },
});
