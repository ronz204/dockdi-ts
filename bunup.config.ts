import { defineConfig } from "bunup";
import { exports, unused } from "bunup/plugins";

export default defineConfig({
  entry: ["source/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  clean: true,
  dts: true,
  minify: true,
  sourcemap: true,
  target: "browser",
  plugins: [exports(), unused({ level: "error" })],
});
