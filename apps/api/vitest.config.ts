import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@webanwendung/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});