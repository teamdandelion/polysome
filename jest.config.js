/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    {
      preset: "ts-jest",
      displayName: "test",
      testMatch: ["**/*.test.ts"],
      testEnvironment: "jsdom",
    },
    {
      preset: "ts-jest",
      displayName: "perf",
      testMatch: ["**/*.perf.ts"],
      testEnvironment: "jsdom",
    },
  ],
};
