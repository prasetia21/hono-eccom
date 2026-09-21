import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/helpers/setup.ts"],

    include: ["src/modules/**/*.test.ts", "test/**/*.test.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "src/db/",
        "test/",
        "**/*.config.ts",
        "drizzle.config.ts",
        "server.ts",
      ],
    },
  },
});
