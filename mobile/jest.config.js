module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  setupFiles: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}", "!src/**/__tests__/**"],
  // Floor pinned to measured baseline (2026-07-28); raise as UX-M*/BUG-H* tasks add tests.
  coverageThreshold: {
    global: { statements: 8, lines: 8, branches: 6, functions: 4 },
  },
};
