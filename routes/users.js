const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");

// Normalize various truthy/falsey representations from forms/APIs into real booleans
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (["1", "true", "on", "yes", "y"].includes(v)) return true;
    if (["0", "false", "off", "no", "n"].includes(v)) return false;
  }
  return defaultValue;
}

// GET all users (excluding password) with website access
router.get("/", async (req, res) => {
  try {
    const pool = await db;
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        a.AuthorID,
        a.AuthorLogin,
        a.AuthorName,
        a.AuthorEmail,
        a.IsAdmin,
        a.AuthorCategory,
        a.AuthorType,
        a.IsActive,
        a.DateCreated,
        a.LastLoginDate,
        a.CurrentWorkingSite,
        STRING_AGG(w.Domain, ', ') as AccessibleWebsites,
        STRING_AGG(CAST(w.WebsiteID as VARCHAR), ',') as AccessibleWebsiteIDs
      FROM Authors a
      LEFT JOIN AuthorWebsiteAccess awa ON a.AuthorID = awa.AuthorID
      LEFT JOIN Websites w ON awa.WebsiteID = w.WebsiteID
      GROUP BY a.AuthorID, a.AuthorLogin, a.AuthorName, a.AuthorEmail, 
               a.IsAdmin, a.AuthorCategory, a.AuthorType, a.IsActive, 
               a.DateCreated, a.LastLoginDate, a.CurrentWorkingSite
      ORDER BY a.AuthorName
    `);

    // Render the users page instead of returning JSON
    res.render("pages/users", {
      title: "User Management",
      users: result.recordset,
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: (
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "UN"
        )
          .split(" ")
          .map((n) => n[0])
          .join(""),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
        isAdmin: req.session.userInfo?.isAdmin || false,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render("pages/error", {
      error: "Failed to fetch users",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: (
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "UN"
        )
          .split(" ")
          .map((n) => n[0])
          .join(""),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
});

// GET all users as JSON (for API calls)
router.get("/api/all", async (req, res) => {
  try {
    const pool = await db;
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        a.AuthorID,
        a.AuthorLogin,
        a.AuthorName,
        a.AuthorEmail,
        a.IsAdmin,
        a.AuthorCategory,
        a.AuthorType,
        a.IsActive,
        a.DateCreated,
        a.LastLoginDate,
        a.CurrentWorkingSite,
        STRING_AGG(w.Domain, ', ') as AccessibleWebsites,
        STRING_AGG(CAST(w.WebsiteID as VARCHAR), ',') as AccessibleWebsiteIDs
      FROM Authors a
      LEFT JOIN AuthorWebsiteAccess awa ON a.AuthorID = awa.AuthorID
      LEFT JOIN Websites w ON awa.WebsiteID = w.WebsiteID
      GROUP BY a.AuthorID, a.AuthorLogin, a.AuthorName, a.AuthorEmail, 
               a.IsAdmin, a.AuthorCategory, a.AuthorType, a.IsActive, 
               a.DateCreated, a.LastLoginDate, a.CurrentWorkingSite
      ORDER BY a.AuthorName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET single user (excluding password) with website access
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("id", sql.Int, parseInt(id));

    const result = await request.query(`
      SELECT 
        a.AuthorID,
        a.AuthorLogin,
        a.AuthorName,
        a.AuthorEmail,
        a.IsAdmin,
        a.AuthorCategory,
        a.AuthorType,
        a.IsActive,
        a.DateCreated,
        a.LastLoginDate,
        a.CurrentWorkingSite,
        STRING_AGG(w.Domain, ', ') as AccessibleWebsites,
        STRING_AGG(CAST(w.WebsiteID as VARCHAR), ',') as AccessibleWebsiteIDs
      FROM Authors a
      LEFT JOIN AuthorWebsiteAccess awa ON a.AuthorID = awa.AuthorID
      LEFT JOIN Websites w ON awa.WebsiteID = w.WebsiteID
      WHERE a.AuthorID = @id
      GROUP BY a.AuthorID, a.AuthorLogin, a.AuthorName, a.AuthorEmail, 
               a.IsAdmin, a.AuthorCategory, a.AuthorType, a.IsActive, 
               a.DateCreated, a.LastLoginDate, a.CurrentWorkingSite
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// CREATE new user
router.post("/", async (req, res) => {
  try {
    const {
      AuthorLogin,
      AuthorPassword,
      AuthorName,
      AuthorEmail,
      IsAdmin,
      AuthorCategory,
      AuthorType,
      IsActive,
    } = req.body;

    if (!AuthorLogin || !AuthorPassword || !AuthorName || !AuthorEmail) {
      return res.status(400).json({
        error:
          "AuthorLogin, AuthorPassword, AuthorName, and AuthorEmail are required",
      });
    }

    const now = new Date();
    const pool = await db;
    const request = pool.request();
    request.input("AuthorLogin", sql.NVarChar, AuthorLogin);
    request.input("AuthorPassword", sql.NVarChar, AuthorPassword);
    request.input("AuthorName", sql.NVarChar, AuthorName);
    request.input("AuthorEmail", sql.NVarChar, AuthorEmail);
    request.input("IsAdmin", sql.Bit, IsAdmin || false);
    request.input("AuthorCategory", sql.NVarChar, AuthorCategory || "");
    request.input("AuthorType", sql.NVarChar, AuthorType || "");
    request.input("IsActive", sql.Bit, IsActive);
    request.input("DateCreated", sql.DateTime2, now);

    const result = await request.query(`
      INSERT INTO Authors (
        AuthorLogin, AuthorPassword, AuthorName, AuthorEmail, 
        IsAdmin, AuthorCategory, AuthorType, IsActive, DateCreated
      )
      OUTPUT INSERTED.AuthorID, INSERTED.AuthorLogin, INSERTED.AuthorName, 
             INSERTED.AuthorEmail, INSERTED.IsAdmin, INSERTED.AuthorCategory,
             INSERTED.AuthorType, INSERTED.IsActive, INSERTED.DateCreated
      VALUES (
        @AuthorLogin, @AuthorPassword, @AuthorName, @AuthorEmail,
        @IsAdmin, @AuthorCategory, @AuthorType, @IsActive, @DateCreated
      )
    `);

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "User created",
      targetUserId: result.recordset[0].AuthorID,
      success: true,
      additionalInfo: AuthorName,
    });

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error("Error creating user:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "User creation",
      success: false,
      additionalInfo: AuthorName || AuthorLogin,
    });

    if (error.number === 2627) {
      // Unique constraint violation
      res.status(400).json({ error: "A user with this login already exists" });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
});

// UPDATE user (excluding password unless specifically provided)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      AuthorLogin,
      AuthorName,
      AuthorEmail,
      IsAdmin,
      AuthorCategory,
      AuthorType,
      IsActive,
    } = req.body;

    // First, get current user data to preserve required fields
    const pool = await db;
    const getCurrentRequest = pool.request();
    getCurrentRequest.input("id", sql.Int, parseInt(id));
    const currentUserResult = await getCurrentRequest.query(`
      SELECT AuthorLogin, AuthorName, AuthorEmail, IsActive, IsAdmin 
      FROM Authors 
      WHERE AuthorID = @id
    `);

    if (currentUserResult.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentUser = currentUserResult.recordset[0];

    // Debug logging
    console.log("UPDATE USER DEBUG:");
    console.log("User ID:", id);
    console.log("Request body:", req.body);
    console.log("Current user from DB:", currentUser);
    console.log("IsActive value from request:", IsActive);
    console.log("IsActive type:", typeof IsActive);

    // Ensure we have valid values and don't pass null to required fields
    const safeAuthorLogin = AuthorLogin || currentUser.AuthorLogin;
    const safeAuthorName = AuthorName || currentUser.AuthorName;
    const safeAuthorEmail = AuthorEmail || currentUser.AuthorEmail;

    console.log("Safe values:");
    console.log("safeAuthorLogin:", safeAuthorLogin);
    console.log("safeAuthorName:", safeAuthorName);
    console.log("safeAuthorEmail:", safeAuthorEmail);

    if (!safeAuthorLogin || !safeAuthorName || !safeAuthorEmail) {
      console.log("ERROR: Required fields are missing or null");
      return res.status(400).json({
        error:
          "AuthorLogin, AuthorName, and AuthorEmail are required and cannot be null",
        debug: {
          currentUser,
          requestBody: req.body,
          safeValues: { safeAuthorLogin, safeAuthorName, safeAuthorEmail },
        },
      });
    }

    // Normalize boolean flags from request.
    // For HTML forms, unchecked checkboxes are omitted entirely -> treat as false so user can turn flags off.
    // For JSON requests, fall back to existing DB values if omitted.
    const isJson = req.is && req.is("application/json");

    // Support both 'IsActive' and 'isActive' (same for Admin) from different clients
    const hasIsAdmin =
      Object.prototype.hasOwnProperty.call(req.body, "IsAdmin") ||
      Object.prototype.hasOwnProperty.call(req.body, "isAdmin");
    const hasIsActive =
      Object.prototype.hasOwnProperty.call(req.body, "IsActive") ||
      Object.prototype.hasOwnProperty.call(req.body, "isActive");

    const incomingIsAdmin = Object.prototype.hasOwnProperty.call(
      req.body,
      "IsAdmin"
    )
      ? req.body.IsAdmin
      : req.body.isAdmin;

    const incomingIsActive = Object.prototype.hasOwnProperty.call(
      req.body,
      "IsActive"
    )
      ? req.body.IsActive
      : req.body.isActive;

    const safeIsAdmin = hasIsAdmin
      ? parseBoolean(incomingIsAdmin)
      : isJson
      ? currentUser.IsAdmin
      : false;

    const safeIsActive = hasIsActive
      ? parseBoolean(incomingIsActive)
      : isJson
      ? currentUser.IsActive
      : false;

    // Debug logging for boolean normalization
    console.log("Content-Type is JSON:", Boolean(isJson));
    console.log(
      "Incoming IsActive (raw):",
      incomingIsActive,
      "type:",
      typeof incomingIsActive,
      "hasIsActive:",
      hasIsActive
    );
    console.log(
      "Computed safeIsActive:",
      safeIsActive,
      "type:",
      typeof safeIsActive
    );
    console.log(
      "Incoming IsAdmin (raw):",
      incomingIsAdmin,
      "type:",
      typeof incomingIsAdmin,
      "hasIsAdmin:",
      hasIsAdmin
    );
    console.log(
      "Computed safeIsAdmin:",
      safeIsAdmin,
      "type:",
      typeof safeIsAdmin
    );

    const request = pool.request();
    request.input("id", sql.Int, parseInt(id));
    request.input("AuthorLogin", sql.NVarChar, safeAuthorLogin);
    request.input("AuthorName", sql.NVarChar, safeAuthorName);
    request.input("AuthorEmail", sql.NVarChar, safeAuthorEmail);
    request.input("IsAdmin", sql.Bit, safeIsAdmin);
    request.input("AuthorCategory", sql.NVarChar, AuthorCategory || "");
    request.input("AuthorType", sql.NVarChar, AuthorType || "");
    request.input("IsActive", sql.Bit, safeIsActive);

    const updateResult = await request.query(`
      UPDATE Authors SET 
        AuthorLogin = @AuthorLogin,
        AuthorName = @AuthorName,
        AuthorEmail = @AuthorEmail,
        IsAdmin = @IsAdmin,
        AuthorCategory = @AuthorCategory,
        AuthorType = @AuthorType,
        IsActive = @IsActive
      WHERE AuthorID = @id
    `);

    console.log("Update result:", updateResult);
    console.log("Rows affected:", updateResult.rowsAffected);

    // Fetch the updated record (excluding password)
    const selectRequest = pool.request();
    selectRequest.input("id", sql.Int, parseInt(id));
    const result = await selectRequest.query(`
      SELECT 
        AuthorID,
        AuthorLogin,
        AuthorName,
        AuthorEmail,
        IsAdmin,
        AuthorCategory,
        AuthorType,
        IsActive,
        DateCreated,
        LastLoginDate,
        CurrentWorkingSite
      FROM Authors 
      WHERE AuthorID = @id
    `);

    if (result.recordset.length === 0) {
      await NotificationService.notifyUserAction({
        req,
        action: "User update",
        targetUserId: parseInt(id),
        success: false,
        additionalInfo: "User not found",
      });
      return res.status(404).json({ error: "User not found" });
    }

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "User updated",
      targetUserId: parseInt(id),
      success: true,
      additionalInfo: AuthorName,
    });

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error updating user:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "User update",
      targetUserId: parseInt(id),
      success: false,
      additionalInfo: AuthorName || AuthorLogin,
    });

    if (error.number === 2627) {
      // Unique constraint violation
      res.status(400).json({ error: "A user with this login already exists" });
    } else {
      res.status(500).json({ error: "Failed to update user" });
    }
  }
});

// UPDATE user password (separate endpoint for security)
router.put("/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { AuthorPassword } = req.body;

    if (!AuthorPassword) {
      return res.status(400).json({ error: "AuthorPassword is required" });
    }

    const pool = await db;
    const request = pool.request();
    request.input("id", sql.Int, parseInt(id));
    request.input("AuthorPassword", sql.NVarChar, AuthorPassword);

    const result = await request.query(`
      UPDATE Authors SET AuthorPassword = @AuthorPassword 
      WHERE AuthorID = @id
    `);

    if (result.rowsAffected[0] === 0) {
      await NotificationService.notifyUserAction({
        req,
        action: "Password update",
        targetUserId: parseInt(id),
        success: false,
        additionalInfo: "User not found",
      });
      return res.status(404).json({ error: "User not found" });
    }

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "Password updated",
      targetUserId: parseInt(id),
      success: true,
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "Password update",
      targetUserId: parseInt(id),
      success: false,
    });

    res.status(500).json({ error: "Failed to update password" });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("id", sql.Int, parseInt(id));

    const result = await request.query(`
      DELETE FROM Authors WHERE AuthorID = @id
    `);

    if (result.rowsAffected[0] === 0) {
      await NotificationService.notifyUserAction({
        req,
        action: "User deletion",
        targetUserId: parseInt(id),
        success: false,
        additionalInfo: "User not found",
      });
      return res.status(404).json({ error: "User not found" });
    }

    // Create success notification
    await NotificationService.notifyUserAction({
      req,
      action: "User deleted",
      targetUserId: parseInt(id),
      success: true,
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);

    // Create error notification
    await NotificationService.notifyUserAction({
      req,
      action: "User deletion",
      targetUserId: parseInt(id),
      success: false,
    });

    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET all available websites
router.get("/websites/available", async (req, res) => {
  try {
    const isAdmin =
      req.session.userInfo?.IsAdmin || req.session.userInfo?.isAdmin || false;

    // Only admins can view all available websites
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "You are not authorized to view all websites." });
    }

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
router.get("/:id/websites", async (req, res) => {
  try {
    const { id } = req.params;
    const authorID = req.session.authorID;
    const isAdmin =
      req.session.userInfo?.IsAdmin || req.session.userInfo?.isAdmin || false;

    // Allow access if user is admin or viewing their own data
    if (!authorID || (!isAdmin && parseInt(id) !== authorID)) {
      return res
        .status(403)
        .json({ error: "You are not authorized to view this data." });
    }

    const pool = await db;
    const request = pool.request();
    request.input("AuthorID", sql.Int, parseInt(id)); // Use the target user ID, not the logged-in user ID

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
router.post("/:id/websites/:websiteId", async (req, res) => {
  try {
    const { id, websiteId } = req.params;
    const isAdmin =
      req.session.userInfo?.IsAdmin || req.session.userInfo?.isAdmin || false;

    // Only admins can manage website access for users
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "You are not authorized to manage website access." });
    }

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
router.delete("/:id/websites/:websiteId", async (req, res) => {
  try {
    const { id, websiteId } = req.params;
    const isAdmin =
      req.session.userInfo?.IsAdmin || req.session.userInfo?.isAdmin || false;

    // Only admins can manage website access for users
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: "You are not authorized to manage website access." });
    }

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
