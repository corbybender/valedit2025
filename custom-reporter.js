const chalk = require("chalk");

class CustomReporter {
  onRunComplete(_, results) {
    logger.info("\nTest Results Summary:\n");
    results.testResults.forEach((test) => {
      logger.info(
        test.numFailingTests > 0
          ? chalk.red(`❌ ${test.testFilePath}`)
          : chalk.green(`✅ ${test.testFilePath}`)
      );

      test.testResults.forEach((assertion) => {
        if (assertion.status === "failed") {
          logger.error(`  ❌ ${assertion.title}`);
        } else {
          logger.debug(`  ✅ ${assertion.title}`);
        }
      });
    });
  }
}

module.exports = CustomReporter;
