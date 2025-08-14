module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  reporters: ["default", ["./custom-reporter.js", {}]],
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
