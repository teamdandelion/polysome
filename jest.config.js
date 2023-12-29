/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  projects: [
    { preset: "ts-jest", displayName: "test", testMatch: ["**/*.test.ts"] },
    { preset: "ts-jest", displayName: "perf", testMatch: ["**/*.perf.ts"] },
  ],
};
