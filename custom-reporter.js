const chalk = require("chalk");

class CustomReporter {
  onRunComplete(_, results) {
    console.log("\nTest Results Summary:\n");
    results.testResults.forEach((test) => {
      console.log(
        test.numFailingTests > 0
          ? chalk.red(`❌ ${test.testFilePath}`)
          : chalk.green(`✅ ${test.testFilePath}`)
      );

      test.testResults.forEach((assertion) => {
        if (assertion.status === "failed") {
          console.error(`  ❌ ${assertion.title}`);
        } else {
          console.log(`  ✅ ${assertion.title}`);
        }
      });
    });
  }
}

module.exports = CustomReporter;
