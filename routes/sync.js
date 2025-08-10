const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");

// Get sync status overview
router.get("/", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    logger.info(`🔄 Sync status route - authorID: ${authorID}`);

    if (!authorID) {
      logger.info("❌ No authorID in session, redirecting to login");
      return res.redirect("/auth/login");
    }

    // Get sync queue statistics
    const pool = await db;
    const syncStats = await pool
      .request()
      .input("AuthorID", sql.Int, authorID)
      .query(`
        SELECT 
          COUNT(*) as TotalItems,
          SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as PendingItems,
          SUM(CASE WHEN Status = 'processing' THEN 1 ELSE 0 END) as ProcessingItems,
          SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as CompletedItems,
          SUM(CASE WHEN Status = 'failed' THEN 1 ELSE 0 END) as FailedItems
        FROM PageSyncQueue psq
        JOIN Pages p ON psq.PageID = p.PageID
        JOIN AuthorWebsiteAccess awa ON p.WebsiteID = awa.WebsiteID
        WHERE awa.AuthorID = @AuthorID
      `);

    const stats = syncStats.recordset[0] || {
      TotalItems: 0,
      PendingItems: 0, 
      ProcessingItems: 0,
      CompletedItems: 0,
      FailedItems: 0
    };

    // Render sync status page
    res.render("pages/sync", {
      title: "Sync Status",
      stats: stats
    });

  } catch (err) {
    logger.error("Error in sync status route", {
      error: err,
      sessionID: req.sessionID,
      authorID: req.session.authorID,
    });

    // Create error notification
    await NotificationService.error({
      userId: req.session?.userInfo?.authorId || req.session?.authorID,
      title: "Sync Status Error",
      message: "Failed to load sync status",
      category: "sync",
    });

    res.status(500).render("error", { 
      title: "Error", 
      message: "Error loading sync status." 
    });
  }
});

// Get sync queue items (API endpoint)
router.get("/queue", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const pool = await db;
    const queueItems = await pool
      .request()
      .input("AuthorID", sql.Int, authorID)
      .input("Offset", sql.Int, offset)
      .input("Limit", sql.Int, limit)
      .query(`
        SELECT 
          psq.ID,
          psq.PageID,
          psq.WebsiteID,
          psq.Action,
          psq.Status,
          psq.QueuedAt,
          psq.ProcessedAt,
          psq.ErrorMessage,
          p.Title as PageTitle,
          w.Domain as WebsiteDomain
        FROM PageSyncQueue psq
        JOIN Pages p ON psq.PageID = p.PageID
        JOIN Websites w ON psq.WebsiteID = w.WebsiteID
        JOIN AuthorWebsiteAccess awa ON psq.WebsiteID = awa.WebsiteID
        WHERE awa.AuthorID = @AuthorID
        ORDER BY psq.QueuedAt DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `);

    res.json({
      items: queueItems.recordset,
      page: page,
      limit: limit
    });

  } catch (err) {
    logger.error("Error fetching sync queue", {
      error: err,
      authorID: req.session.authorID,
    });
    res.status(500).json({ error: "Failed to fetch sync queue" });
  }
});

// Retry failed sync items
router.post("/retry/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const authorID = req.session.authorID;

    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const pool = await db;
    
    // Verify user has access to this sync item
    const accessCheck = await pool
      .request()
      .input("SyncID", sql.Int, id)
      .input("AuthorID", sql.Int, authorID)
      .query(`
        SELECT psq.ID
        FROM PageSyncQueue psq
        JOIN Pages p ON psq.PageID = p.PageID
        JOIN AuthorWebsiteAccess awa ON p.WebsiteID = awa.WebsiteID
        WHERE psq.ID = @SyncID AND awa.AuthorID = @AuthorID
      `);

    if (accessCheck.recordset.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Reset the sync item to pending status
    await pool
      .request()
      .input("SyncID", sql.Int, id)
      .query(`
        UPDATE PageSyncQueue 
        SET Status = 'pending', 
            ErrorMessage = NULL,
            ProcessedAt = NULL
        WHERE ID = @SyncID
      `);

    // Create success notification
    await NotificationService.info({
      userId: authorID,
      title: "Sync Retry",
      message: `Sync item ${id} has been queued for retry`,
      category: "sync",
    });

    res.json({ success: true, message: "Sync item queued for retry" });

  } catch (err) {
    logger.error("Error retrying sync item", {
      error: err,
      syncId: req.params.id,
      authorID: req.session.authorID,
    });
    res.status(500).json({ error: "Failed to retry sync item" });
  }
});

module.exports = router;