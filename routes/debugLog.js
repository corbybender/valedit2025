const express = require("express");
const router = express.Router();
const debugLogger = require("../debug-logger");

// POST endpoint to receive frontend debug logs
router.post("/", async (req, res) => {
  try {
    const { category, message, data } = req.body;
    
    // Log to file via the debug logger
    debugLogger.log(`FRONTEND_${category}`, message, data);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error logging debug message:", error);
    res.status(500).json({ error: "Failed to log debug message" });
  }
});

// GET endpoint to retrieve the log file contents
router.get("/", async (req, res) => {
  try {
    const fs = require('fs');
    const logPath = debugLogger.getLogPath();
    
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      res.type('text/plain').send(logContent);
    } else {
      res.status(404).send('Log file not found');
    }
  } catch (error) {
    console.error("Error reading log file:", error);
    res.status(500).json({ error: "Failed to read log file" });
  }
});

module.exports = router;