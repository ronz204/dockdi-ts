import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      dockdi: "./source/index.ts",
      "@core": "./source/core",
      "@errors": "./source/errors",
      "@service": "./source/service",
      "@bench": "./testing/bench",
      "@helpers": "./testing/helpers",
      "@integration": "./testing/integration",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
    coverage: { provider: "v8" },
    passWithNoTests: true,
  },
});
