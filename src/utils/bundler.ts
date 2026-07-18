import { statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { cwd } from "./cwd";
import { Logger } from "./logger";

export class Bundler {
	private static logger = new Logger("Bundler");

	static async buildViews(viewsDir: string, outDir: string = "./public") {
		const viewsDirAbs = resolve(viewsDir);
		const viewsDirStat = statSync(viewsDirAbs, { throwIfNoEntry: false });
		if (!viewsDirStat || !viewsDirStat.isDirectory()) return;

		const bunstoneDir = join(cwd(), ".bunstone");
		const bunstoneDirExists = await Bun.file(bunstoneDir).exists();
		if (!bunstoneDirExists) {
			await mkdir(bunstoneDir, { recursive: true });
		}

		const files = await Bundler.getFilesRecursively(viewsDirAbs);
		Bundler.logger.log(
			`Auto-bundling views from ${viewsDirAbs} (${files.length} views found)`,
		);

		for (const absolutePath of files) {
			if (absolutePath.endsWith(".tsx") || absolutePath.endsWith(".jsx")) {
				const componentName = basename(absolutePath, extname(absolutePath));
				const entryPath = join(bunstoneDir, `${componentName}.client.tsx`);
				const bundleName = `${componentName.toLowerCase()}.bundle.js`;

				const entryContent = Bundler.generateHydrationEntry(
					absolutePath,
					componentName,
				);
				await Bun.write(entryPath, entryContent);

				await Bundler.bundleView(entryPath, outDir, bundleName);
			}
		}
	}

	private static async bundleView(
		entryPath: string,
		outdir: string,
		outputName: string,
	) {
		try {
			const result = await Bun.build({
				entrypoints: [entryPath],
				outdir: outdir,
				naming: outputName,
				minify: true,
				external: [
					"react",
					"react-dom",
					"react-dom/client",
					"react/jsx-runtime",
					"react/jsx-dev-runtime",
				],
			});

			if (!result.success) {
				Bundler.logger.error(
					`Bundle failed for ${outputName}: ${result.logs
						.map((l) => l.message)
						.join("\n")}`,
				);
			} else {
				Bundler.logger.log(
					`Bundle created successfully: ${outdir}/${outputName}`,
				);
			}
		} catch (error: any) {
			Bundler.logger.error(
				`Error during bundling ${outputName}: ${error.message}`,
			);
		}
	}

	private static async getFilesRecursively(dir: string): Promise<string[]> {
		let results: string[] = [];
		const list = await readdir(dir);
		for (const file of list) {
			const fullPath = join(dir, file);
			const stat = statSync(fullPath);
			if (stat?.isDirectory()) {
				results = results.concat(await Bundler.getFilesRecursively(fullPath));
			} else {
				results.push(resolve(fullPath));
			}
		}
		return results;
	}

	private static generateHydrationEntry(path: string, name: string) {
		return `
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Mod from '${path}';

const Component = Mod['${name}'] || Mod.default;

function hydrate() {
  const dataElement = document.getElementById("__BUNSTONE_DATA__");
  const data = dataElement ? JSON.parse(dataElement.textContent || "{}") : {};

  if (typeof document !== 'undefined' && Component) {
    const root = document.getElementById("root");
    if (root) {
      try {
        hydrateRoot(root, React.createElement(Component, data));
        console.log('[Bunstone] Hydration successful for component: ${name}');
      } catch (e) {
        console.error('[Bunstone] Hydration failed for component: ${name}', e);
      }
    } else {
      console.error('[Bunstone] Root element "root" not found for hydration.');
    }
  } else {
    console.error('[Bunstone] Component ${name} not found in bundle.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
`;
	}

	static async buildApp(
		entrypoint: string,
		outdir: string = "./dist",
		compile: boolean = false,
	) {
		const entryAbs = resolve(entrypoint);
		if (!(await Bun.file(entryAbs).exists())) {
			throw new Error(`Entrypoint not found: ${entrypoint}`);
		}

		Bundler.logger.log(`Building application from ${entrypoint}...`);

		if (compile) {
			const result = await Bun.spawn(
				[
					"bun",
					"build",
					entrypoint,
					"--compile",
					"--outfile",
					join(outdir, "app"),
				],
				{
					stdout: "inherit",
					stderr: "inherit",
				},
			);
			const exitCode = await result.exited;
			if (exitCode !== 0) {
				throw new Error("Compilation failed");
			}
		} else {
			const result = await Bun.build({
				entrypoints: [entrypoint],
				outdir: outdir,
				target: "bun",
				minify: true,
				sourcemap: "external",
				external: ["react", "react-dom", "elysia", "@elysiajs/*"],
			});

			if (!result.success) {
				Bundler.logger.error(
					"Build failed:",
					result.logs.map((l) => l.message).join("\n"),
				);
				throw new Error("Application build failed");
			}
			Bundler.logger.log(`Application built successfully to ${outdir}`);
		}
	}
}
