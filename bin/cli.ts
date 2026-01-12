#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
let command = args[0];
let projectName = args[1];

// Default to "new" command if only project name is provided
if (command && command !== "new" && !projectName) {
  projectName = command;
  command = "new";
}

// Default project name if none provided
if (!projectName && command === "new") {
  projectName = "my-bunstone-app";
}

const projectPath = join(process.cwd(), projectName || "");

async function scaffold() {
  if (command !== "new" || !projectName) {
    console.log("Usage: bunstone new <project-name>");
    console.log("   or: bunstone <project-name>");
    process.exit(1);
  }

  console.log(`🚀 Scaffolding new Bunstone project in ${projectPath}...`);

  try {
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectPath, "src"), { recursive: true });
    await mkdir(join(projectPath, "src/controllers"), { recursive: true });
    await mkdir(join(projectPath, "src/services"), { recursive: true });
    await mkdir(join(projectPath, "src/views"), { recursive: true });

    // package.json
    const pkg = {
      name: projectName,
      version: "1.0.0",
      main: "src/main.ts",
      scripts: {
        start: "bun run src/main.ts",
        dev: "bun --watch src/main.ts",
        test: "bun test",
      },
      dependencies: {
        "@diariodaregiao/bunstone": "latest",
        "reflect-metadata": "^0.2.2",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        zod: "^4.3.2",
      },
      devDependencies: {
        "@types/bun": "latest",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
      },
    };

    await writeFile(
      join(projectPath, "package.json"),
      JSON.stringify(pkg, null, 2)
    );

    // tsconfig.json
    const tsconfig = {
      compilerOptions: {
        lib: ["ESNext"],
        module: "esnext",
        target: "esnext",
        moduleResolution: "bundler",
        moduleDetection: "force",
        allowImportingTsExtensions: true,
        noEmit: true,
        composite: true,
        strict: true,
        downlevelIteration: true,
        skipLibCheck: true,
        jsx: "react-jsx",
        jsxImportSource: "react",
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        types: ["bun-types"],
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        baseUrl: ".",
        paths: {
          "@/*": ["./src/*"],
        },
      },
    };

    await writeFile(
      join(projectPath, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2)
    );

    // src/main.ts
    const mainTs = `import { AppStartup } from "@diariodaregiao/bunstone";
import { AppModule } from "@/app.module";

async function bootstrap() {
  const app = AppStartup.create(AppModule);
  app.listen(3000);
}
bootstrap();
`;

    await writeFile(join(projectPath, "src/main.ts"), mainTs);

    // src/app.module.ts
    const appModuleTs = `import { Module } from "@diariodaregiao/bunstone";
import { AppController } from "@/controllers/app.controller";
import { AppService } from "@/services/app.service";

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;

    await writeFile(join(projectPath, "src/app.module.ts"), appModuleTs);

    // src/controllers/app.controller.ts
    const controllerTs = `import { Controller, Get, Render } from "@diariodaregiao/bunstone";
import { AppService } from "@/services/app.service";
import { Welcome } from "@/views/Welcome";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render(Welcome)
  getHello() {
    return this.appService.getHello();
  }
}
`;

    await writeFile(
      join(projectPath, "src/controllers/app.controller.ts"),
      controllerTs
    );

    // src/services/app.service.ts
    const serviceTs = `import { Injectable } from "@diariodaregiao/bunstone";

@Injectable()
export class AppService {
  getHello() {
    return { 
      message: "Hello from Bunstone!",
      timestamp: new Date().toISOString()
    };
  }
}
`;

    await writeFile(
      join(projectPath, "src/services/app.service.ts"),
      serviceTs
    );

    // src/views/Welcome.tsx
    const welcomeTsx = `import React from "react";
import { Layout } from "@diariodaregiao/bunstone";

export const Welcome = ({ message, timestamp }: { message: string, timestamp: string }) => (
  <Layout title="Welcome to Bunstone">
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">{message}</h1>
      <p className="text-gray-500 text-sm">Generated at: {timestamp}</p>
      <div className="mt-6">
        <a 
          href="https://github.com/diariodaregiao/bunstone" 
          className="text-indigo-500 hover:text-indigo-700 font-medium"
        >
          Read the docs &rarr;
        </a>
      </div>
    </div>
  </Layout>
);
`;

    await writeFile(join(projectPath, "src/views/Welcome.tsx"), welcomeTsx);

    // .gitignore
    await writeFile(
      join(projectPath, ".gitignore"),
      "node_modules\n.DS_Store\ndist\n.env\n"
    );

    console.log("📦 Installing dependencies...");
    try {
      execSync("bun install", { cwd: projectPath, stdio: "inherit" });
    } catch (e) {
      console.warn("⚠️ Could not run 'bun install'. Please run it manually.");
    }

    console.log("\n✅ Project created successfully!");
    console.log("\nNext steps:\n  cd " + projectName + "\n  bun dev\n");
  } catch (error) {
    console.error("❌ Error scaffolding project:", error);
  }
}

scaffold();
