// Test categories mirror the CI stages:
//   unit        - anything outside src/app (services, http client, hooks, helpers)
//   integration - screens under src/app, rendered wired to their services/router
const shared = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = {
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}", "!src/**/__tests__/**"],
  // Floor pinned to measured baseline (2026-07-28); raise as UX-M*/BUG-H* tasks add tests.
  coverageThreshold: {
    global: { statements: 8, lines: 8, branches: 6, functions: 4 },
  },
  projects: [
    {
      ...shared,
      displayName: "unit",
      testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
      testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/src/app/"],
    },
    {
      ...shared,
      displayName: "integration",
      testMatch: ["<rootDir>/src/app/**/*.test.{ts,tsx}"],
    },
  ],
};
