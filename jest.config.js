module.exports = {
  testEnvironment: "node",
  reporters: ["default", ["./custom-reporter.js", {}]],
};
