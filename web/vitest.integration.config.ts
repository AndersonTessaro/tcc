import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests: the app wired together (router + providers + services)
// with only the network boundary faked. Own CI stage, own coverage-free run.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.integration.test.{ts,tsx}"],
  },
});
