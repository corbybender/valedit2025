const fs = require("fs");
const path = require("path");

class DebugLogger {
  constructor() {
    this.logFile = path.join(__dirname, "shared-block-debug.log");
    this.clearLog();
  }

  clearLog() {
    try {
      fs.writeFileSync(
        this.logFile,
        `=== SHARED BLOCK DEBUG LOG - ${new Date().toISOString()} ===\n`
      );
    } catch (error) {
      console.error("Failed to initialize log file", { error: error });
    }
  }

  log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logText = `\n[${timestamp}] [${category}] ${message}\n${
      data ? JSON.stringify(data, null, 2) + "\n" : ""
    }`;

    try {
      fs.appendFileSync(this.logFile, logText);
    } catch (error) {
      console.error("Failed to write to log file", { error: error });
    }
  }

  info(message, data = null) {
    this.log("INFO", message, data);
  }

  error(message, data = null) {
    this.log("ERROR", message, data);
  }

  warn(message, data = null) {
    this.log("WARN", message, data);
  }

  debug(message, data = null) {
    this.log("DEBUG", message, data);
  }

  logRequest(method, url, body = null, headers = null) {
    this.log("HTTP_REQUEST", `${method} ${url}`, {
      method,
      url,
      body,
      headers,
    });
  }

  logResponse(status, data = null) {
    this.log("HTTP_RESPONSE", `Status: ${status}`, {
      status,
      data,
    });
  }

  logError(category, error, context = null) {
    this.log(`ERROR_${category}`, error.message, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  getLogPath() {
    return this.logFile;
  }
}

const logger = new DebugLogger();
global.logger = logger;
module.exports = logger;
