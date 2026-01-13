import { defineConfig } from "vite";

export default defineConfig({
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: ["bunstone.diario.one", "localhost", "127.0.0.1"],
  },
});
