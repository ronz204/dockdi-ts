import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": "./source/core",
      "@errors": "./source/errors",
      "@service": "./source/service",
    },
  },
  test: {
    include: ["testing/**/*.test.ts"],
    passWithNoTests: true,
  },
});
