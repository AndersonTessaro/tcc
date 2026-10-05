module.exports = {
  preset: "jest-expo",
  testEnvironment: "<rootDir>/tests/live/native-environment.cjs",
  setupFiles: ["./jest.setup.ts"],
  moduleNameMapper: { "^@/assets/(.*)$": "<rootDir>/assets/$1", "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["<rootDir>/tests/live/**/*.test.tsx"],
  testTimeout: 20000,
};
