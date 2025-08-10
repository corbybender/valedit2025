const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");

// Get application logs
router.get("/", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    logger.info(`📋 Logs route - authorID: ${authorID}`);

    if (!authorID) {
      logger.info("❌ No authorID in session, redirecting to login");
      return res.redirect("/auth/login");
    }

    // Render logs page
    res.render("pages/logs", {
      title: "Application Logs"
    });

  } catch (err) {
    logger.error("Error in logs route", {
      error: err,
      sessionID: req.sessionID,
      authorID: req.session.authorID,
    });

    // Create error notification
    await NotificationService.error({
      userId: req.session?.userInfo?.authorId || req.session?.authorID,
      title: "Logs Loading Error",
      message: "Failed to load logs page",
      category: "system",
    });

    res.status(500).render("error", { 
      title: "Error", 
      message: "Error loading logs." 
    });
  }
});

// Get log entries (API endpoint)
router.get("/api", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 entries
    const level = req.query.level || 'all';
    const search = req.query.search || '';

    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log(`📋 DEBUG: Loading logs - page: ${page}, limit: ${limit}, level: ${level}, search: "${search}"`);

    // Read the log file directly since this app uses file-based logging
    const fs = require('fs');
    const path = require('path');
    const logFilePath = path.join(__dirname, '..', 'shared-block-debug.log');

    let logContent = '';
    let logs = [];

    try {
      if (fs.existsSync(logFilePath)) {
        logContent = fs.readFileSync(logFilePath, 'utf8');
        console.log(`📋 DEBUG: Log file found, size: ${logContent.length} characters`);
      } else {
        console.log(`📋 DEBUG: Log file not found at ${logFilePath}`);
        logContent = '';
      }
    } catch (fileError) {
      console.error('📋 ERROR: Failed to read log file:', fileError);
      logContent = '';
    }

    // Parse log entries from file content
    if (logContent) {
      const logLines = logContent.split('\n');
      const logEntries = [];
      let currentEntry = null;

      for (const line of logLines) {
        // Match log entry pattern: [timestamp] [level] message
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
          // If we have a previous entry, save it
          if (currentEntry) {
            logEntries.push(currentEntry);
          }
          // Start new entry
          currentEntry = {
            CreatedAt: match[1],
            Level: match[2],
            Message: match[3],
            Logger: 'FileLogger',
            Exception: null
          };
        } else if (currentEntry && line.trim()) {
          // This is a continuation line (JSON data, stack trace, etc.)
          if (currentEntry.Message.length < 500) { // Limit message length
            currentEntry.Message += '\n' + line;
          }
        }
      }
      // Add the last entry
      if (currentEntry) {
        logEntries.push(currentEntry);
      }

      logs = logEntries.reverse(); // Most recent first
      console.log(`📋 DEBUG: Parsed ${logs.length} log entries`);
    }

    // Apply filters
    let filteredLogs = logs;
    
    if (level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.Level.toLowerCase() === level.toLowerCase());
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.Message.toLowerCase().includes(searchLower) ||
        log.Logger.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    console.log(`📋 DEBUG: Returning ${paginatedLogs.length} logs out of ${total} total`);

    res.json({
      logs: paginatedLogs,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages
      }
    });

  } catch (err) {
    console.error('📋 ERROR: Error fetching logs:', err);
    console.error('📋 ERROR: Error stack:', err.stack);
    res.status(500).json({ 
      error: "Failed to fetch logs", 
      details: err.message,
      logs: [], // Return empty array to prevent frontend errors
      pagination: {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0
      }
    });
  }
});

// Clear old logs
router.delete("/cleanup", async (req, res) => {
  try {
    const authorID = req.session.authorID;

    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log(`🧹 DEBUG: Log cleanup requested by user ${authorID}`);

    // For file-based logging, we'll just clear the current log file
    // In a real application, you might want to add admin role checking here
    const fs = require('fs');
    const path = require('path');
    const logFilePath = path.join(__dirname, '..', 'shared-block-debug.log');

    try {
      if (fs.existsSync(logFilePath)) {
        // Clear the log file by writing a new header
        const newContent = `=== SHARED BLOCK DEBUG LOG - ${new Date().toISOString()} ===\n[${new Date().toISOString()}] [INFO] Log file cleared by user ${authorID}\n`;
        fs.writeFileSync(logFilePath, newContent);
        
        console.log(`🧹 DEBUG: Log file cleared successfully`);
        
        res.json({ 
          success: true, 
          message: "Log file cleared successfully",
          deletedCount: "N/A (file cleared)"
        });
      } else {
        res.json({ 
          success: true, 
          message: "Log file does not exist, nothing to clear",
          deletedCount: 0
        });
      }
    } catch (fileError) {
      console.error('🧹 ERROR: Failed to clear log file:', fileError);
      res.status(500).json({ error: "Failed to clear log file", details: fileError.message });
    }

  } catch (err) {
    console.error('🧹 ERROR: Error during log cleanup:', err);
    res.status(500).json({ error: "Failed to cleanup logs", details: err.message });
  }
});

module.exports = router;