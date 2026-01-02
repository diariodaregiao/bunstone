#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const projectName = process.argv[2] || "my-bunstone-app";
const projectPath = join(process.cwd(), projectName);

async function scaffold() {
  console.log(`🚀 Scaffolding new Bunstone project in ${projectPath}...`);

  try {
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectPath, "src"), { recursive: true });
    await mkdir(join(projectPath, "src/controllers"), { recursive: true });
    await mkdir(join(projectPath, "src/services"), { recursive: true });

    // package.json
    const pkg = {
      name: projectName,
      version: "1.0.0",
      main: "src/index.ts",
      scripts: {
        start: "bun run src/index.ts",
        dev: "bun --watch src/index.ts",
        test: "bun test",
      },
      dependencies: {
        "@diariodaregiao/bunstone": "latest",
        "reflect-metadata": "^0.2.2",
        zod: "^4.3.4",
      },
      devDependencies: {
        "@types/bun": "latest",
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
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        allowJs: true,
        types: ["bun-types"],
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    };

    await writeFile(
      join(projectPath, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2)
    );

    // src/index.ts
    const indexTs = `import "reflect-metadata";
import { AppStartup, Module } from "@diariodaregiao/bunstone";
import { AppController } from "./controllers/app.controller";
import { AppService } from "./services/app.service";

@Module({
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

const app = AppStartup.create(AppModule);
app.listen(3000);
`;

    await writeFile(join(projectPath, "src/index.ts"), indexTs);

    // src/controllers/app.controller.ts
    const controllerTs = `import { Controller, Get } from "@diariodaregiao/bunstone";
import { AppService } from "../services/app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
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
    return { message: "Hello from Bunstone!" };
  }
}
`;

    await writeFile(
      join(projectPath, "src/services/app.service.ts"),
      serviceTs
    );

    // .gitignore
    await writeFile(
      join(projectPath, ".gitignore"),
      "node_modules\n.DS_Store\ndist\n"
    );

    console.log("📦 Installing dependencies...");
    execSync("bun install", { cwd: projectPath, stdio: "inherit" });

    console.log("\n✅ Project created successfully!");
    console.log(`\nNext steps:\n  cd ${projectName}\n  bun dev\n`);
  } catch (error) {
    console.error("❌ Error scaffolding project:", error);
  }
}

scaffold();
