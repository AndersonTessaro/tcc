import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

// Unit tests: everything under src/**/*.test.{ts,tsx} except the integration
// suites (*.integration.test.tsx), which run in their own CI stage via
// vitest.integration.config.ts.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: [...configDefaults.exclude, "**/*.integration.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
      // Floor pinned to the measured baseline (2026-07-26); raise as UX-W*/BUG-H* tasks add tests.
      thresholds: { statements: 5, lines: 5, branches: 35, functions: 30 },
    },
  },
});
