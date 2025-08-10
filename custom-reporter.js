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
        logger.info(
          assertion.status === "failed"
            ? chalk.red(`  ❌ ${assertion.title}`)
            : chalk.green(`  ✅ ${assertion.title}`)
        );
      });
    });
  }
}

module.exports = CustomReporter;
