import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@source": "./source",
      "@testing": "./testing",
    },
  },
  test: {
    include: ["source/**/*.test.ts", "testing/**/*.test.ts"],
    passWithNoTests: true,
  },
});
