"use strict";

// Load environment variables
require("dotenv").config();

// Initialize global logger first
require("../debug-logger.js");

// Core dependencies
const express = require("express");
const path = require("path");
const morgan = require("morgan");

// Configuration
const appConfig = require("./config/app");
const { fallbackSession } = require("./config/session");

// Middleware
const currentWebsiteMiddleware = require("./middleware/currentWebsite");
const { isAuthenticated } = require("./middleware/authentication");
const {
  notFoundHandler,
  globalErrorHandler,
} = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const mainRoutes = require("./routes/mainRoutes");
const userRoutes = require("./routes/userRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
const syncRoutes = require("../legacy/routes_old/sync.js");

// API Routes
const pagesApiRoutes = require("./routes/api/pagesApiRoutes");
const contentBlocksApiRoutes = require("./routes/api/contentBlocksApiRoutes");
const templatesApiRoutes = require("./routes/api/templatesApiRoutes");
const websitesApiRoutes = require("./routes/api/websitesApiRoutes");
const sharedContentApiRoutes = require("./routes/api/sharedContentApiRoutes");
const notificationsApiRoutes = require("./routes/api/notificationsApiRoutes");
const azureStorageApiRoutes = require("./routes/api/azureStorageApiRoutes");
const analyticsRoutes = require("../legacy/routes_old/analytics");
const settingsRoutes = require("./routes/settingsRoutes");

// Initialize Express app
const app = express();

// ================================================================
// MIDDLEWARE SETUP
// ================================================================

// Static files
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// Body parsing with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan("dev"));

// Session management
app.use(fallbackSession);

// Current website middleware (after session)
app.use(currentWebsiteMiddleware);

// View engine setup
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// ================================================================
// ROUTES SETUP
// ================================================================

// Authentication routes
app.use("/auth", authRoutes);

// Main application routes
app.use("/", mainRoutes);
app.use("/sync", isAuthenticated, syncRoutes);

// API routes
app.use("/api/pages", pagesApiRoutes);
app.use("/api/pagecontentblocks", contentBlocksApiRoutes);
app.use("/api/pagetemplates", templatesApiRoutes);
app.use("/api/websites", websitesApiRoutes);
app.use("/api/sharedcontent", sharedContentApiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationsApiRoutes);
app.use("/api/analytics", isAuthenticated, analyticsRoutes);
app.use("/api/settings", settingsRoutes);

// Azure Storage routes (with authentication)
app.use(
  "/azure-storage",
  isAuthenticated,
  currentWebsiteMiddleware,
  azureStorageApiRoutes
);

// Legacy routes (for backward compatibility)
const legacyWebsitesRoutes = require("../legacy/routes_old/websites");
const legacyPagesRoutes = require("../legacy/routes_old/pages");
const legacyContentRoutes = require("../legacy/routes_old/content");
const legacyContentBlocksRoutes = require("../legacy/routes_old/contentBlocks");
const legacyTemplatesRoutes = require("../legacy/routes_old/templates");
const legacyUsersRoutes = require("../legacy/routes_old/users");
const legacyNotificationsRoutes = require("../legacy/routes_old/notifications");
const legacySharedContentRoutes = require("../legacy/routes_old/sharedContent");
const legacyAzureStorageRoutes = require("../legacy/routes_old/AzureStorage");
const logsRoutes = require("../legacy/routes_old/logs");
// const frontendLogRoutes = require("../routes/frontendLog");
const legacyDb = require("../legacy/db");

// Mount legacy routes with database and authentication
app.use(
  "/websites",
  (req, res, next) => {
    console.log("🌐 WEBSITES ROUTE HIT:", req.method, req.originalUrl);
    console.log("🌐 SESSION CHECK:", {
      hasSession: !!req.session,
      hasUserInfo: !!req.session?.userInfo,
      authorID: req.session?.authorID,
    });
    next();
  },
  isAuthenticated,
  legacyWebsitesRoutes(legacyDb)
);
app.use("/pages", isAuthenticated, legacyPagesRoutes);
app.use(
  "/content",
  isAuthenticated,
  currentWebsiteMiddleware,
  legacyContentRoutes
);
app.use("/contentblocks", isAuthenticated, legacyContentBlocksRoutes);
app.use("/templates", isAuthenticated, legacyTemplatesRoutes);
app.use("/users", isAuthenticated, legacyUsersRoutes);
app.use("/notifications", isAuthenticated, legacyNotificationsRoutes);
app.use("/sharedcontent", isAuthenticated, legacySharedContentRoutes);
app.use(
  "/azurestorage",
  isAuthenticated,
  currentWebsiteMiddleware,
  legacyAzureStorageRoutes
);
app.use("/logs", isAuthenticated, logsRoutes);
// app.use("/api/frontend-log", frontendLogRoutes);

// ================================================================
// ERROR HANDLING
// ================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// ================================================================
// SERVER STARTUP
// ================================================================

const startServer = async () => {
  try {
    // Initialize Azure configuration first
    const azureConfig = require("./config/azure");
    await azureConfig.azureConfigPromise; // Wait for Azure initialization
    
    app.listen(appConfig.port, () => {
      logger.info(`🚀 Server listening on port ${appConfig.port}`);
      logger.info(`🌍 Environment: ${appConfig.nodeEnv}`);
      logger.info(
        `🔐 Azure AD Authentication: ${
          azureConfig.isAzureConfigured ? "Configured" : "Not configured"
        }`
      );

      if (appConfig.isDevelopment) {
        logger.info(`📱 Local URL: http://localhost:${appConfig.port}`);
      }

      // Start log cleanup scheduler
      startLogCleanupScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Log cleanup scheduler
const startLogCleanupScheduler = () => {
  const db = require("../legacy/db");

  const cleanupInfoLogs = async () => {
    try {
      const pool = await db;
      await pool.request().execute("CleanupInfoLogs");
      logger.debug("📋 Info logs cleanup completed");
    } catch (error) {
      logger.error("❌ Error during log cleanup:", {
        error: error.message,
        stack: error.stack,
      });
    }
  };

  // Run cleanup every 5 minutes (300,000 ms)
  const cleanupInterval = setInterval(cleanupInfoLogs, 5 * 60 * 1000);

  // Run initial cleanup after 30 seconds
  setTimeout(cleanupInfoLogs, 30 * 1000);

  logger.info("🧹 Log cleanup scheduler started (runs every 5 minutes)");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    logger.info("🧹 Log cleanup scheduler stopped");
  });

  process.on("SIGINT", () => {
    clearInterval(cleanupInterval);
    logger.info("🧹 Log cleanup scheduler stopped");
  });
};

// Start the server
startServer();

module.exports = app;
