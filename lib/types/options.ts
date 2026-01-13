import type { CORSConfig } from "@elysiajs/cors";

/**
 * Configuration for the Email Adapter.
 */
export type EmailConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
};

/**
 * Options for configuring the application.
 * @property cors - CORS configuration options.
 * @property swagger - Swagger configuration options.
 */
export type Options = {
  cors?: CORSConfig;
  viewsDir?: string;
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
