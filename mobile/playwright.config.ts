import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 8091);
const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";

// Drives the Expo web build against a running backend (docker compose + harmonia-app jar).
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  outputDir: "e2e-results",
  use: {
    ...devices["Pixel 7"],
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { EXPO_PUBLIC_API_URL: API_URL, CI: "1" },
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
