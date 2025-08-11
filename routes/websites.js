// routes/websites.js
const express = require("express");
const sql = require("mssql");
const workingSite = require("../src/services/workingSiteService"); // Required to get the current selection
const NotificationService = require("../src/services/notificationService");
// const logger = require("../utils/logger"); // logger is global

// The function now accepts the 'db' pool object
module.exports = (db) => {
  console.log("🔧 WEBSITES ROUTER INITIALIZED with db:", !!db);
  const router = express.Router();

  // Test route to verify router is working
  router.get("/test", (req, res) => {
    console.log("🧪 TEST ROUTE HIT");
    res.send("Websites router is working!");
  });

  // This route now renders the HTML page
  router.get("/", async (req, res) => {
    try {
      const authorID = req.session.authorID;
      logger.debug(
        `🌐 Websites route - authorID: ${authorID}, sessionID: ${req.sessionID}`
      );

      if (!authorID) {
        // If there's no author in the session, they shouldn't be here.
        logger.debug("❌ No authorID in session, redirecting to login");
        return res.redirect("/auth/login");
      }

      // First check if this author has any website access records
      const pool = await db;
      const accessCheck = await pool
        .request()
        .input("AuthorID", sql.Int, authorID)
        .query(
          `SELECT COUNT(*) as AccessCount FROM dbo.AuthorWebsiteAccess WHERE AuthorID = @AuthorID`
        );

      logger.debug(
        `🔍 Author ${authorID} has ${accessCheck.recordset[0].AccessCount} website access records.`
      );

      // Update the query to filter websites by AuthorWebsiteAccess
      const result = await pool.request().input("AuthorID", sql.Int, authorID)
        .query(`SELECT w.WebsiteID, w.Domain
                FROM dbo.Websites w
                JOIN dbo.AuthorWebsiteAccess awa ON w.WebsiteID = awa.WebsiteID
                WHERE awa.AuthorID = @AuthorID AND w.IsActive = 1
                ORDER BY w.Domain`);

      logger.debug(
        `📋 Found ${result.recordset.length} accessible websites for author ${authorID}.`
      );

      // Fetch the user's currently selected website to highlight it in the UI
      const currentSite = await workingSite.getCurrentWorkingSite(authorID);

      // FIX: Use res.render() to build the HTML page with the data
      res.render("pages/websites", {
        title: "Select a Website",
        websites: result.recordset,
        currentWorkingSite: currentSite,
      });
    } catch (err) {
      logger.error("Error fetching websites in /websites route", {
        error: err,
        sessionID: req.sessionID,
        authorID: req.session.authorID,
      });

      // Create error notification
      await NotificationService.error({
        userId: req.session?.userInfo?.authorId || req.session?.authorID,
        title: "Website Loading Error",
        message: "Failed to load websites page",
        category: "website_management",
      });

      // Render an error page or send a simple message
      res.status(500).send("Error loading the websites page.");
    }
  });

  // Get all page paths for a website (moved from pages.js for consistency)
  router.get("/:websiteId/paths", async (req, res) => {
    const { websiteId } = req.params; // Moved outside of try block
    try {
      const pool = await db;
      const request = pool.request();

      const result = await request
        .input("websiteId", sql.Int, websiteId)
        .query(
          "SELECT DISTINCT Path FROM Pages WHERE WebsiteID = @websiteId AND Path IS NOT NULL AND Path <> ''"
        );

      const paths = result.recordset.map((row) => row.Path);
      res.json(paths);
    } catch (error) {
      logger.error(`Error fetching paths for websiteId ${websiteId}`, {
        error: error,
        websiteId: websiteId,
      });

      // Create error notification
      await NotificationService.error({
        userId: req.session?.userInfo?.authorId || req.session?.authorID,
        title: "Path Fetch Error",
        message: `Failed to fetch paths for website ${websiteId}`,
        category: "website_management",
        websiteId: parseInt(websiteId),
      });

      res.status(500).json({ error: "Failed to fetch paths" });
    }
  });

  // Simple test route to verify basic functionality
  router.get("/:websiteId/pages-test", (req, res) => {
    res.send(`Test route works! WebsiteId: ${req.params.websiteId}`);
  });

  // Simple debug route to verify routing is working
  router.get("/:websiteId/debug-pages", (req, res) => {
    console.log("DEBUG ROUTE HIT!");
    res.send(`Debug route works! WebsiteId: ${req.params.websiteId}`);
  });

  // Route to display pages for a specific website
  router.get("/:websiteId/website-pages", async (req, res) => {
    console.log(
      "🚨 ROUTE HIT: /websites/:websiteId/website-pages handler started"
    );
    const { websiteId } = req.params;
    console.log("🚨 PARAMS EXTRACTED: websiteId =", websiteId);

    try {
      // Validate websiteId
      if (!websiteId || isNaN(parseInt(websiteId))) {
        console.log(`❌ DEBUG: Invalid websiteId: ${websiteId}`);
        return res.status(400).json({ error: "Invalid website ID" });
      }

      console.log(
        `🔍 DEBUG: Starting /websites/${websiteId}/website-pages route`
      );

      const authorID = req.session.authorID;
      console.log(`🔍 DEBUG: AuthorID from session: ${authorID}`);

      if (!authorID) {
        console.log("❌ DEBUG: No authorID in session, redirecting to login");
        return res.redirect("/auth/login");
      }

      console.log(
        `🔍 DEBUG: About to check database access for websiteId: ${websiteId}, authorID: ${authorID}`
      );

      // Check if user has access to this website
      const pool = await db;
      console.log(`🔍 DEBUG: Database pool obtained`);

      if (!pool) {
        throw new Error("Database connection not available");
      }

      const accessCheck = await pool
        .request()
        .input("AuthorID", sql.Int, parseInt(authorID))
        .input("WebsiteID", sql.Int, parseInt(websiteId)).query(`
          SELECT COUNT(*) as AccessCount 
          FROM dbo.AuthorWebsiteAccess 
          WHERE AuthorID = @AuthorID AND WebsiteID = @WebsiteID
        `);

      console.log(`🔍 DEBUG: Access check result:`, accessCheck.recordset[0]);

      if (accessCheck.recordset[0].AccessCount === 0) {
        console.log(
          `❌ DEBUG: User ${authorID} has no access to website ${websiteId}`
        );
        return res
          .status(403)
          .send("Access Denied: You don't have access to this website");
      }

      console.log(`🔍 DEBUG: Access granted, fetching website info`);

      // Get website info
      const websiteResult = await pool
        .request()
        .input("WebsiteID", sql.Int, parseInt(websiteId))
        .query("SELECT Domain FROM dbo.Websites WHERE WebsiteID = @WebsiteID");

      console.log(`🔍 DEBUG: Website query result:`, websiteResult.recordset);

      if (websiteResult.recordset.length === 0) {
        console.log(`❌ DEBUG: Website ${websiteId} not found`);
        return res.status(404).send("Website not found");
      }

      const website = websiteResult.recordset[0];
      console.log(
        `🔍 DEBUG: About to render pages view for website: ${website.Domain}`
      );

      // Get all pages for this website
      console.log(`🔍 DEBUG: Fetching pages for website ${websiteId}`);
      const pagesResult = await pool
        .request()
        .input("websiteId", sql.Int, parseInt(websiteId)).query(`
          SELECT 
            PageID, 
            Title, 
            URL, 
            Path,
            ParentPageID
          FROM Pages 
          WHERE WebsiteID = @websiteId 
          ORDER BY Title
        `);

      console.log(`🔍 DEBUG: Found ${pagesResult.recordset.length} pages`);

      // Build page tree structure
      const pages = pagesResult.recordset;
      let pageTree = [];

      if (pages.length > 0) {
        const pageMap = new Map();
        pages.forEach((page) =>
          pageMap.set(page.PageID, {
            ...page,
            children: [],
            syncStatus: {
              status: "COMPLETED", // Default status for now
              changeType: null,
              queuedAt: null,
            },
          })
        );

        // Build tree structure
        for (const page of pageMap.values()) {
          if (page.ParentPageID && pageMap.has(page.ParentPageID)) {
            pageMap.get(page.ParentPageID).children.push(page);
          } else {
            pageTree.push(page);
          }
        }
      }

      console.log(
        `🔍 DEBUG: Built page tree with ${pageTree.length} root pages`
      );

      // Render the pages view for this website
      res.render("pages/pages", {
        title: `Pages - ${website.Domain}`,
        user: {
          name: "User",
          initials: "U",
          username: "user",
          loginMethod: "Local",
          isAdmin: false,
        },
        currentWorkingSite: {
          WebsiteID: parseInt(websiteId),
          WebsiteName: website.Domain,
        },
        website: website,
        pageTree: pageTree, // Actual pages from database
        currentSort: "title",
      });

      console.log(`✅ DEBUG: Successfully rendered pages view`);
    } catch (err) {
      console.error(
        `❌ DEBUG: Error in /websites/${websiteId}/website-pages route:`,
        err
      );
      console.error(`❌ DEBUG: Error stack:`, err.stack);
      console.error(`❌ DEBUG: Error name:`, err.name);
      console.error(`❌ DEBUG: Error code:`, err.code);

      // Try to use logger if available, otherwise use console
      if (typeof logger !== "undefined") {
        logger.error(`Error in /websites/${websiteId}/website-pages route`, {
          error: err,
          errorMessage: err.message,
          errorName: err.name,
          errorCode: err.code,
          sessionID: req.sessionID,
          authorID: req.session?.authorID,
          websiteId: websiteId,
          stack: err.stack,
        });
      }

      res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        code: err.code || "UNKNOWN_ERROR",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  });

  // This sitemap route is for fetching data, so res.json() is correct here.
  router.get("/:websiteId/sitemap", async (req, res) => {
    const { websiteId } = req.params; // Moved outside of try block
    try {
      const pool = await db;
      const request = pool.request();

      const result = await request
        .input("websiteId", sql.Int, websiteId)
        .query(
          "SELECT PageID, ParentPageID, Title, URL FROM dbo.Pages WHERE WebsiteID = @websiteId ORDER BY Title"
        );
      const pages = result.recordset;
      if (!pages.length) return res.json([]);

      const pageMap = new Map();
      pages.forEach((page) =>
        pageMap.set(page.PageID, { ...page, children: [] })
      );
      const rootPages = [];
      for (const page of pageMap.values()) {
        if (page.ParentPageID && pageMap.has(page.ParentPageID)) {
          pageMap.get(page.ParentPageID).children.push(page);
        } else {
          rootPages.push(page);
        }
      }
      res.json(rootPages);
    } catch (err) {
      logger.error(`Error fetching sitemap for websiteId ${websiteId}`, {
        error: err,
        websiteId: websiteId,
      });

      // Create error notification
      await NotificationService.error({
        userId: req.session?.userInfo?.authorId || req.session?.authorID,
        title: "Sitemap Fetch Error",
        message: `Failed to fetch sitemap for website ${websiteId}`,
        category: "website_management",
        websiteId: parseInt(websiteId),
      });

      res.status(500).json({ error: "Error fetching sitemap data" });
    }
  });

  return router;
};
