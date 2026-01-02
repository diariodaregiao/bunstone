import type { CORSConfig } from "@elysiajs/cors";

/**
 * Options for configuring the application.
 * @property cors - CORS configuration options.
 * @property swagger - Swagger configuration options.
 */
export type Options = {
  cors?: CORSConfig;
  swagger?: {
    path?: string;
    documentation?: {
      info: {
        title: string;
        version: string;
        description?: string;
      };
      tags?: { name: string; description: string }[];
    };
  };
};
