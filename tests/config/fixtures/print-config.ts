/**
 * Run by config-env-files.test.ts from a scratch directory holding `.env`
 * files: prints what `defineConfig` read from `Bun.env`.
 */
import { z } from "zod";
import { defineConfig } from "../../../src/config/define-config";

const config = defineConfig(
	z.object({
		SOURCE: z.string().default("unset"),
		LOCAL: z.string().default("unset"),
		PORT: z.coerce.number().default(3000),
	}),
);

console.log(`CONFIG ${JSON.stringify(config)}`);
