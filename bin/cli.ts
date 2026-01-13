#!/usr/bin/env bun
import { join } from "node:path";
import {
  readdir,
  copyFile,
  mkdir as fsMkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { cwd } from "../lib/utils/cwd";

const args = Bun.argv.slice(2);
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

const projectPath = join(cwd(), projectName || "");
const starterPath = join(import.meta.dir, "..", "starter");

async function copyDir(src: string, dest: string) {
  await fsMkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function scaffold() {
  if (command !== "new" || !projectName) {
    console.log("Usage: bunstone new <project-name>");
    console.log("   or: bunstone <project-name>");
    process.exit(1);
  }

  console.log(`🚀 Scaffolding new Bunstone project in ${projectPath}...`);

  try {
    // Copy the entire starter directory
    await copyDir(starterPath, projectPath);

    // Update package.json name
    const pkgPath = join(projectPath, "package.json");
    const pkgContent = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    pkg.name = projectName;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    console.log("📦 Installing dependencies...");
    try {
      Bun.spawn({
        cmd: ["bun", "install"],
        cwd: projectPath,
        stdout: "inherit",
        stderr: "inherit",
      });
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
