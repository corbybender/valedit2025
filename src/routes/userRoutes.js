const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isAuthenticated, isAdmin } = require("../middleware/authentication");
const db = require("../config/database");
const sql = require("mssql");
const NotificationService = require("../services/notificationService");

// API routes
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", isAdmin, userController.createUser);
router.put("/:id", isAdmin, userController.updateUser);
router.delete("/:id", isAdmin, userController.deleteUser);

// Website management routes
// GET all available websites
router.get("/websites/available", isAdmin, async (req, res) => {
  try {
    const pool = await db;
    const request = pool.request();
    const result = await request.query(`
      SELECT WebsiteID, Domain 
      FROM Websites 
      ORDER BY Domain
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching available websites:", error);
    res.status(500).json({ error: "Failed to fetch available websites" });
  }
});

// GET user's website access
router.get("/:id/websites", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const authorID = req.session.authorID;
    const isAdminUser =
      req.session.userInfo?.IsAdmin || req.session.userInfo?.isAdmin || false;

    // Allow access if user is admin or viewing their own data
    if (!authorID || (!isAdminUser && parseInt(id) !== authorID)) {
      return res
        .status(403)
        .json({ error: "You are not authorized to view this data." });
    }

    const pool = await db;
    const request = pool.request();
    request.input("AuthorID", sql.Int, parseInt(id)); // Use the target user ID

    const result = await request.query(
      `SELECT w.WebsiteID, w.Domain
       FROM dbo.Websites w
       JOIN dbo.AuthorWebsiteAccess awa ON w.WebsiteID = awa.WebsiteID
       WHERE awa.AuthorID = @AuthorID
       ORDER BY w.Domain`
    );

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching accessible websites:", err);
    res.status(500).json({ error: "Failed to fetch accessible websites." });
  }
});

// ADD website access for user
router.post("/:id/websites/:websiteId", isAdmin, async (req, res) => {
  try {
    const { id, websiteId } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("authorId", sql.Int, parseInt(id));
    request.input("websiteId", sql.Int, parseInt(websiteId));

    // Check if access already exists
    const checkResult = await request.query(`
      SELECT COUNT(*) as count 
      FROM AuthorWebsiteAccess 
      WHERE AuthorID = @authorId AND WebsiteID = @websiteId
    `);

    if (checkResult.recordset[0].count > 0) {
      return res
        .status(400)
        .json({ error: "User already has access to this website" });
    }

    // Add access
    await request.query(`
      INSERT INTO AuthorWebsiteAccess (AuthorID, WebsiteID) 
      VALUES (@authorId, @websiteId)
    `);

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "Website access granted",
      targetUserId: parseInt(id),
      success: true,
      additionalInfo: `Website ID: ${websiteId}`,
    });

    res.json({ success: true, message: "Website access granted successfully" });
  } catch (error) {
    console.error("Error adding website access:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "Website access grant",
      targetUserId: parseInt(id),
      success: false,
      additionalInfo: `Website ID: ${websiteId}`,
    });

    res.status(500).json({ error: "Failed to add website access" });
  }
});

// REMOVE website access for user
router.delete("/:id/websites/:websiteId", isAdmin, async (req, res) => {
  try {
    const { id, websiteId } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("authorId", sql.Int, parseInt(id));
    request.input("websiteId", sql.Int, parseInt(websiteId));

    const result = await request.query(`
      DELETE FROM AuthorWebsiteAccess 
      WHERE AuthorID = @authorId AND WebsiteID = @websiteId
    `);

    if (result.rowsAffected[0] === 0) {
      await NotificationService.notifyUserAction({
        req,
        action: "Website access removal",
        targetUserId: parseInt(id),
        success: false,
        additionalInfo: `Website ID: ${websiteId} - Access not found`,
      });
      return res.status(404).json({ error: "Website access not found" });
    }

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "Website access removed",
      targetUserId: parseInt(id),
      success: true,
      additionalInfo: `Website ID: ${websiteId}`,
    });

    res.json({ success: true, message: "Website access removed successfully" });
  } catch (error) {
    console.error("Error removing website access:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "Website access removal",
      targetUserId: parseInt(id),
      success: false,
      additionalInfo: `Website ID: ${websiteId}`,
    });

    res.status(500).json({ error: "Failed to remove website access" });
  }
});

module.exports = router;
