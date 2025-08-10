const express = require("express");
const router = express.Router();
const sql = require("mssql");
const db = require("../db");
// const logger = require("../utils/logger");

// Get user notifications with pagination
router.get("/", async (req, res) => {
  try {
    logger.info("🔔 GET /api/notifications called");
    logger.info("🔔 Session:", req.session ? "exists" : "null");
    logger.info("🔔 AuthorID:", req.session?.authorID);
    logger.info("🔔 User Agent:", req.get("User-Agent")?.substring(0, 50));

    const userId = req.session?.authorID;
    if (!userId) {
      logger.info("🔔 Authentication failed - no userId in session");
      return res.status(401).json({ error: "User not authenticated" });
    }

    logger.info(`🔔 Fetching notifications for user ${userId}`);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get notifications with pagination
    const pool = await db;
    const notificationsRequest = pool.request();
    const notificationsResult = await notificationsRequest
      .input("userId", sql.Int, userId)
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
        SELECT 
          ID, Title, Message, Type, IsRead, CreatedAt, ReadAt, 
          Category, RelatedEntityType, RelatedEntityID, Metadata, WebsiteID
        FROM Notifications 
        WHERE AuthorID = @userId 
        ORDER BY CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    // Get unread count
    const unreadRequest = pool.request();
    const unreadResult = await unreadRequest.input("userId", sql.Int, userId)
      .query(`
        SELECT COUNT(*) as unreadCount 
        FROM Notifications 
        WHERE AuthorID = @userId AND IsRead = 0
      `);

    // Get total count
    const totalRequest = pool.request();
    const totalResult = await totalRequest.input("userId", sql.Int, userId)
      .query(`
        SELECT COUNT(*) as totalCount 
        FROM Notifications 
        WHERE AuthorID = @userId
      `);

    const unreadCount =
      unreadResult.recordset.length > 0
        ? unreadResult.recordset[0].unreadCount
        : 0;
    const totalCount =
      totalResult.recordset.length > 0
        ? totalResult.recordset[0].totalCount
        : 0;

    const response = {
      notifications: notificationsResult.recordset,
      unreadCount: unreadCount,
      totalCount: totalCount,
      page,
      limit,
      hasMore: offset + limit < totalCount,
    };

    logger.info(
      `🔔 Returning ${response.notifications.length} notifications, ${response.unreadCount} unread`
    );
    res.json(response);
  } catch (error) {
    logger.error("Error fetching notifications", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Create a new notification
router.post("/", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      title,
      message,
      type = "info",
      category = "general",
      websiteId = null,
      relatedEntityType = null,
      relatedEntityID = null,
      metadata = null,
    } = req.body;

    if (!title && !message) {
      return res.status(400).json({ error: "Title or message is required" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request
      .input("userId", sql.Int, userId)
      .input("websiteId", sql.BigInt, websiteId)
      .input("title", sql.NVarChar(255), title || message.substring(0, 255))
      .input("message", sql.NVarChar(1000), message)
      .input("type", sql.NVarChar(20), type)
      .input("category", sql.NVarChar(50), category)
      .input("relatedEntityType", sql.NVarChar(50), relatedEntityType)
      .input("relatedEntityID", sql.NVarChar(100), relatedEntityID)
      .input(
        "metadata",
        sql.NVarChar(sql.MAX),
        metadata ? JSON.stringify(metadata) : null
      ).query(`
        INSERT INTO Notifications 
        (AuthorID, WebsiteID, Title, Message, Type, Category, RelatedEntityType, RelatedEntityID, Metadata)
        OUTPUT INSERTED.ID, INSERTED.CreatedAt
        VALUES (@userId, @websiteId, @title, @message, @type, @category, @relatedEntityType, @relatedEntityID, @metadata)
      `);

    res.status(201).json({
      success: true,
      notification: {
        id: result.recordset[0].ID,
        createdAt: result.recordset[0].CreatedAt,
      },
    });
  } catch (error) {
    logger.error("Error creating notification", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const notificationId = parseInt(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request
      .input("userId", sql.Int, userId)
      .input("notificationId", sql.Int, notificationId).query(`
        UPDATE Notifications 
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE ID = @notificationId AND AuthorID = @userId AND IsRead = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res
        .status(404)
        .json({ error: "Notification not found or already read" });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Error marking notification as read", {
      error: error,
      notificationId: req.params.id,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request.input("userId", sql.Int, userId).query(`
        UPDATE Notifications 
        SET IsRead = 1, ReadAt = GETDATE()
        WHERE AuthorID = @userId AND IsRead = 0
      `);

    res.json({
      success: true,
      markedCount: result.rowsAffected[0],
    });
  } catch (error) {
    logger.error("Error marking all notifications as read", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

// Delete a specific notification
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const notificationId = parseInt(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request
      .input("userId", sql.Int, userId)
      .input("notificationId", sql.Int, notificationId).query(`
        DELETE FROM Notifications 
        WHERE ID = @notificationId AND AuthorID = @userId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting notification", {
      error: error,
      notificationId: req.params.id,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Clear all notifications for user
router.delete("/", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request.input("userId", sql.Int, userId).query(`
        DELETE FROM Notifications 
        WHERE AuthorID = @userId
      `);

    res.json({
      success: true,
      deletedCount: result.rowsAffected[0],
    });
  } catch (error) {
    logger.error("Error clearing all notifications", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to clear all notifications" });
  }
});

// Get unread count only
router.get("/unread-count", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request.input("userId", sql.Int, userId).query(`
        SELECT COUNT(*) as count 
        FROM Notifications 
        WHERE AuthorID = @userId AND IsRead = 0
      `);

    res.json({ count: result.recordset[0].count });
  } catch (error) {
    logger.error("Error getting unread count", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// Test endpoint to create a notification (for testing purposes)
router.post("/test", async (req, res) => {
  try {
    const userId = req.session?.authorID;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await db;
    const request = pool.request();
    const result = await request
      .input("userId", sql.Int, userId)
      .input("websiteId", sql.BigInt, 35) // Use existing website ID
      .input("title", sql.NVarChar(255), "Test Notification")
      .input(
        "message",
        sql.NVarChar(1000),
        "This is a test notification created via API"
      )
      .input("type", sql.NVarChar(20), "success")
      .input("category", sql.NVarChar(50), "test").query(`
        INSERT INTO Notifications 
        (AuthorID, WebsiteID, Title, Message, Type, Category)
        OUTPUT INSERTED.ID, INSERTED.CreatedAt
        VALUES (@userId, @websiteId, @title, @message, @type, @category)
      `);

    res.json({
      success: true,
      message: "Test notification created successfully",
      notification: {
        id: result.recordset[0].ID,
        createdAt: result.recordset[0].CreatedAt,
      },
    });
  } catch (error) {
    logger.error("Error creating test notification", {
      error: error,
      userId: req.session?.authorID,
    });
    res.status(500).json({ error: "Failed to create test notification" });
  }
});

module.exports = router;