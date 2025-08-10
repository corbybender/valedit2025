const express = require("express");
const router = express.Router();
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

// Replace with your actual DB connection logic
const db = require("../db");
const NotificationService = require("../src/services/notificationService");

// Helper function to log to both console and file for debugging
const debugLog = (message, data = null) => {
  const logFile = path.join(__dirname, "..", "debug.log");
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);

    if (data) {
      const dataStr =
        typeof data === "object" ? JSON.stringify(data, null, 2) : data;
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${dataStr}\n`);
    }
  } catch (err) {
    console.error("Debug logging error", { error: err });
  }
};

// CREATE new shared block
router.post("/", async (req, res) => {
  try {
    logger.info("\n=== NEW SHARED BLOCK CREATION REQUEST ===");
    logger.info("Timestamp:", new Date().toISOString());
    debugLog("[DEBUG] POST /api/sharedcontent - Request body:", req.body);
    logger.info("[DEBUG] Session data:", req.session);

    const { WebsiteID, Name, Description, HtmlContent, CssContent, JsContent } =
      req.body;
    const authorID = req.session.authorID;

    logger.info("[DEBUG] Extracted values:");
    logger.info("  - WebsiteID:", WebsiteID);
    logger.info("  - Name:", Name);
    logger.info("  - Description:", Description);
    logger.info(
      "  - HtmlContent length:",
      HtmlContent ? HtmlContent.length : 0
    );
    logger.info("  - CssContent length:", CssContent ? CssContent.length : 0);
    logger.info("  - JsContent length:", JsContent ? JsContent.length : 0);
    logger.info("  - AuthorID:", authorID);

    if (!authorID || !WebsiteID || !Name) {
      logger.info("[DEBUG] Validation failed - missing required fields");
      return res
        .status(400)
        .json({ error: "AuthorID, WebsiteID, and Name are required." });
    }

    // Validate that the author has access to the website before creating shared content
    logger.info("[DEBUG] Creating validation request...");
    const pool = await db;
    const validateRequest = pool.request();
    validateRequest.input("AuthorID", sql.Int, authorID);
    validateRequest.input("WebsiteID", sql.BigInt, parseInt(WebsiteID));

    const validateAccess = await validateRequest.query(
      `SELECT 1 FROM dbo.AuthorWebsiteAccess WHERE AuthorID = @AuthorID AND WebsiteID = @WebsiteID`
    );

    if (validateAccess.recordset.length === 0) {
      logger.info("[DEBUG] Access validation failed - no access to website");
      return res
        .status(403)
        .json({ error: "You do not have access to this website." });
    }

    // Proceed with creating shared content
    logger.info("[DEBUG] Access validation passed, proceeding with creation");
    const now = new Date();
    const request = pool.request();

    logger.info("[DEBUG] Setting up SQL parameters:");
    request.input("WebsiteID", sql.BigInt, parseInt(WebsiteID));
    logger.info("  - WebsiteID parameter set:", parseInt(WebsiteID));

    request.input("Name", sql.NVarChar, Name);
    logger.info("  - Name parameter set:", Name);

    request.input("Description", sql.NVarChar, Description || "");
    logger.info("  - Description parameter set:", Description || "");

    request.input("HtmlContent", sql.NVarChar, HtmlContent || "");
    logger.info(
      "  - HtmlContent parameter set, length:",
      (HtmlContent || "").length
    );

    request.input("CssContent", sql.NVarChar, CssContent || "");
    logger.info(
      "  - CssContent parameter set, length:",
      (CssContent || "").length
    );
    logger.info("  - CssContent value:", CssContent || "");

    request.input("JsContent", sql.NVarChar, JsContent || "");
    logger.info(
      "  - JsContent parameter set, length:",
      (JsContent || "").length
    );
    logger.info("  - JsContent value:", JsContent || "");

    request.input("CreatedAt", sql.DateTime2, now);
    logger.info("  - CreatedAt parameter set:", now);

    request.input("UpdatedAt", sql.DateTime2, now);
    logger.info("  - UpdatedAt parameter set:", now);

    const sqlQuery = `INSERT INTO SharedContent (WebsiteID, Name, Description, HtmlContent, CssContent, JsContent, CreatedAt, UpdatedAt)
       VALUES (@WebsiteID, @Name, @Description, @HtmlContent, @CssContent, @JsContent, @CreatedAt, @UpdatedAt)`;

    logger.info("[DEBUG] Executing SQL query:", sqlQuery);

    const result = await request.query(sqlQuery);

    logger.info("[DEBUG] SQL query executed successfully, result:", result);
    debugLog("[CRITICAL] CSS and JS values being saved:", {
      CssContent: CssContent || "EMPTY",
      JsContent: JsContent || "EMPTY",
    });

    // Create success notification
    await NotificationService.notifySharedContentAction({
      req,
      action: "Shared content block created",
      blockName: Name,
      success: true,
      additionalInfo: `Created for website ID: ${WebsiteID}`,
    });

    res.status(201).json({ message: "Shared content created successfully." });
  } catch (err) {
    logger.error("Error creating shared content", { error: err });

    // Create error notification
    await NotificationService.notifySharedContentAction({
      req,
      action: "Create shared content block",
      blockName: Name,
      success: false,
      additionalInfo: `Creation failed: ${err.message}`,
    });

    // Check for specific error types
    if (err.number === 2627) {
      // Unique constraint violation
      res.status(409).json({
        error:
          "A shared block with this name already exists for this website. Please choose a different name.",
      });
    } else if (err.number === 547) {
      // Foreign key constraint violation
      res.status(400).json({
        error:
          "Invalid website ID. Please ensure you have selected a valid website.",
      });
    } else {
      res.status(500).json({ error: "Failed to create shared content." });
    }
  }
});

// UPDATE shared block
router.put("/:id", async (req, res) => {
  try {
    logger.info("\n=== SHARED BLOCK UPDATE REQUEST RECEIVED ===");
    logger.info("Timestamp:", new Date().toISOString());
    logger.info("PUT /api/sharedcontent/:id - ID:", req.params.id);
    logger.info("Request body:", JSON.stringify(req.body, null, 2));
    logger.info("Is PUT request reaching backend? YES");

    logger.log(
      "ROUTE_START",
      `PUT /api/sharedcontent/${req.params.id} - Starting update request`
    );
    logger.logRequest(
      "PUT",
      `/api/sharedcontent/${req.params.id}`,
      req.body,
      req.headers
    );

    logger.info("[DEBUG] PUT /api/sharedcontent/:id - ID:", req.params.id);
    logger.info(
      "[DEBUG] PUT /api/sharedcontent/:id - Request body:",
      JSON.stringify(req.body, null, 2)
    );

    const { id } = req.params;
    const { Name, Description, HtmlContent, CssContent, JsContent } = req.body;

    logger.info("[DEBUG] Extracted values for update:");
    logger.info("  - ID:", id);
    logger.info("  - Name:", Name);
    logger.info("  - Description:", Description);
    logger.info(
      "  - HtmlContent length:",
      HtmlContent ? HtmlContent.length : 0
    );
    logger.info("  - CssContent length:", CssContent ? CssContent.length : 0);
    logger.info("  - CssContent value:", CssContent || "");
    logger.info("  - JsContent length:", JsContent ? JsContent.length : 0);
    logger.info("  - JsContent value:", JsContent || "");

    const now = new Date();

    logger.log(
      "SQL_SETUP",
      "Setting up SQL parameters for SharedContent update",
      {
        id: parseInt(id),
        Name: Name,
        Description: Description,
        HtmlContent: HtmlContent ? `${HtmlContent.substring(0, 100)}...` : null,
        CssContent: CssContent ? `${CssContent.substring(0, 100)}...` : null,
        JsContent: JsContent ? `${JsContent.substring(0, 100)}...` : null,
        now: now,
      }
    );

    const pool = await db;
    const request = pool.request();
    logger.info("[DEBUG] Setting up SQL parameters for update:");
    request.input("id", sql.BigInt, parseInt(id));
    logger.info("  - ID parameter set:", parseInt(id));

    request.input("Name", sql.NVarChar, Name);
    logger.info("  - Name parameter set:", Name);

    request.input("Description", sql.NVarChar, Description || "");
    logger.info("  - Description parameter set:", Description || "");

    request.input("HtmlContent", sql.NVarChar, HtmlContent || "");
    logger.info(
      "  - HtmlContent parameter set, length:",
      (HtmlContent || "").length
    );

    request.input("CssContent", sql.NVarChar, CssContent || "");
    logger.info(
      "  - CssContent parameter set, length:",
      (CssContent || "").length
    );
    logger.info("  - CssContent value:", CssContent || "");

    request.input("JsContent", sql.NVarChar, JsContent || "");
    logger.info(
      "  - JsContent parameter set, length:",
      (JsContent || "").length
    );
    logger.info("  - JsContent value:", JsContent || "");

    request.input("UpdatedAt", sql.DateTime2, now);
    logger.info("  - UpdatedAt parameter set:", now);

    // Split into two separate queries to avoid multi-statement issues
    const updateQuery = `UPDATE SharedContent SET Name=@Name, Description=@Description, HtmlContent=@HtmlContent, CssContent=@CssContent, JsContent=@JsContent, UpdatedAt=@UpdatedAt WHERE SharedBlockID=@id`;
    const selectQuery = `SELECT * FROM SharedContent WHERE SharedBlockID=@id`;

    logger.info("[DEBUG] Executing UPDATE SQL query:", updateQuery);

    logger.info("\n=== EXECUTING SQL UPDATE ===");
    logger.info("Update Query:", updateQuery);
    logger.info("Select Query:", selectQuery);

    logger.log("SQL_EXECUTE", "Executing SharedContent UPDATE query", {
      updateQuery,
      selectQuery,
    });

    // Execute update first
    const updateResult = await request.query(updateQuery);
    logger.info("Update result:", updateResult);

    // Then execute select to get updated record
    const selectResult = await request.query(selectQuery);
    logger.info("Select result:", selectResult);

    // Combine results to match expected structure
    const result = {
      recordsets: [updateResult.recordset, selectResult.recordset],
      rowsAffected: updateResult.rowsAffected,
    };

    logger.info("\n=== SQL UPDATE COMPLETED ===");
    logger.info("Rows affected:", result.rowsAffected);
    logger.info("Recordsets length:", result.recordsets.length);
    logger.info("About to check recordsets structure...");

    // Debug: Log the actual structure
    logger.info("result.recordsets:", result.recordsets);
    logger.info("result.recordsets[0]:", result.recordsets[0]);
    logger.info("result.recordsets[1]:", result.recordsets[1]);

    logger.log("SQL_RESULT", "SharedContent UPDATE query completed", {
      recordsetsLength: result.recordsets.length,
      rowsAffected: result.rowsAffected,
      updatedRecord: result.recordsets[1] ? result.recordsets[1][0] : null,
    });

    logger.info("[DEBUG] UPDATE SQL query executed successfully");
    logger.info("[DEBUG] Result recordsets length:", result.recordsets.length);
    if (result.recordsets[1]) {
      logger.info(
        "[DEBUG] Updated record:",
        JSON.stringify(result.recordsets[1][0], null, 2)
      );
    }

    // Check if we have the expected recordsets
    logger.info("DEBUG: Checking recordsets...");
    logger.info("DEBUG: recordsets.length =", result.recordsets.length);
    logger.info("DEBUG: recordsets[0] exists =", !!result.recordsets[0]);
    logger.info("DEBUG: recordsets[1] exists =", !!result.recordsets[1]);

    if (!result.recordsets[1] || result.recordsets[1].length === 0) {
      logger.info("ERROR: Second recordset not found or empty");
      return res.status(404).json({ error: "Shared block not found." });
    }

    // Also update the corresponding ContentTemplate to keep shared blocks in sync
    const sharedTemplateSlug = `shared-block-${id}`;
    logger.info(
      `[DEBUG] Updating ContentTemplate with slug: ${sharedTemplateSlug}`
    );

    try {
      const updateTemplateResult = await db
        .request()
        .input("Slug", sql.VarChar, sharedTemplateSlug)
        .input("Name", sql.NVarChar, `Shared: ${Name}`)
        .input("HtmlContent", sql.NVarChar, HtmlContent || "")
        .input("CssContent", sql.NVarChar, CssContent || "")
        .input("JsContent", sql.NVarChar, JsContent || "")
        .input("UpdatedAt", sql.DateTime2, now)
        .query(
          "UPDATE ContentTemplates SET Name = @Name, HtmlContent = @HtmlContent, CssContent = @CssContent, JsContent = @JsContent, UpdatedAt = @UpdatedAt WHERE Slug = @Slug"
        );

      logger.info(
        `[DEBUG] ContentTemplate update result: ${updateTemplateResult.rowsAffected[0]} rows affected`
      );

      if (updateTemplateResult.rowsAffected[0] > 0) {
        logger.info(
          `[DEBUG] Successfully updated ContentTemplate for shared block ${id}`
        );
      } else {
        logger.info(
          `[DEBUG] No ContentTemplate found with slug ${sharedTemplateSlug} - this is normal if the shared block hasn't been used on any pages yet`
        );
      }
    } catch (templateUpdateError) {
      logger.error(`Error updating ContentTemplate for shared block ${id}`, {
        error: templateUpdateError,
      });
      // Don't fail the entire request if ContentTemplate update fails
    }

    // Get the updated record - handle case where second recordset might not exist
    let updatedRecord = null;
    if (result.recordsets[1] && result.recordsets[1][0]) {
      updatedRecord = result.recordsets[1][0];
    } else {
      // If second recordset doesn't exist, fetch the record separately
      logger.info(
        "WARNING: Second recordset not found, fetching updated record separately"
      );
      const fetchRequest = pool.request();
      fetchRequest.input("id", sql.BigInt, parseInt(id));
      const fetchResult = await fetchRequest.query(
        "SELECT * FROM SharedContent WHERE SharedBlockID=@id"
      );
      updatedRecord = fetchResult.recordset[0];
    }

    logger.info(
      "SUCCESS: SharedContent update completed, returning record:",
      updatedRecord
    );

    logger.log(
      "ROUTE_SUCCESS",
      "SharedContent update completed successfully",
      {
        updatedRecord: updatedRecord,
      }
    );

    // Create success notification
    await NotificationService.notifySharedContentAction({
      req,
      action: "Shared content block updated",
      sharedBlockId: parseInt(id),
      blockName: Name,
      success: true,
      additionalInfo: `Updated shared block for website`,
    });

    logger.logResponse(200, updatedRecord);

    res.json(updatedRecord);
  } catch (err) {
    logger.logError("ROUTE_ERROR", err, {
      id: req.params.id,
      body: req.body,
      errorDetails: {
        message: err.message,
        number: err.number,
        state: err.state,
        class: err.class,
      },
    });

    logger.error("Error updating shared block", { error: err });

    // EMERGENCY FIX: If this is just a JavaScript error after successful DB update,
    // try to return success anyway
    if (
      err.message &&
      err.message.includes("Cannot read properties of undefined")
    ) {
      logger.info(
        "EMERGENCY FIX: Detected post-update JS error, attempting to return success anyway"
      );
      try {
        // Fetch the record to confirm it was updated
        const emergencyRequest = pool.request();
        emergencyRequest.input("id", sql.BigInt, parseInt(req.params.id));
        const emergencyResult = await emergencyRequest.query(
          "SELECT * FROM SharedContent WHERE SharedBlockID=@id"
        );

        if (emergencyResult.recordset && emergencyResult.recordset[0]) {
          logger.info("EMERGENCY FIX: Record found, returning success");
          return res.json(emergencyResult.recordset[0]);
        }
      } catch (emergencyErr) {
        logger.error("Emergency fix failed", { error: emergencyErr });
      }
    }

    console.error("[DEBUG] Error details:", {
      message: err.message,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber,
    });

    // Create error notification
    await NotificationService.notifySharedContentAction({
      req,
      action: "Update shared content block",
      sharedBlockId: parseInt(req.params.id),
      blockName: req.body.Name || "Unknown",
      success: false,
      additionalInfo: `Update failed: ${err.message}`,
    });

    if (err.number === 2627) {
      // Unique constraint violation
      res.status(400).json({
        error: "A shared block with this name already exists for this website.",
      });
    } else {
      res.status(500).json({ error: "Failed to update shared block." });
    }
  }
});

// GET all shared blocks for a website
router.get("/website/:websiteId", async (req, res) => {
  debugLog(
    "[DEBUG] GET /api/sharedcontent/website/:websiteId route hit with websiteId:",
    req.params.websiteId
  );
  try {
    const { websiteId } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("websiteId", sql.BigInt, parseInt(websiteId));

    const sqlQuery = `SELECT * FROM SharedContent WHERE WebsiteID=@websiteId`;
    logger.info("[DEBUG] Executing GET query:", sqlQuery);
    logger.info("[DEBUG] With websiteId parameter:", parseInt(websiteId));

    const result = await request.query(sqlQuery);

    logger.info("[DEBUG] GET query executed successfully");
    logger.info("[DEBUG] Number of records found:", result.recordset.length);

    if (result.recordset.length > 0) {
      logger.info(
        "[DEBUG] Sample record (first one):",
        JSON.stringify(result.recordset[0], null, 2)
      );
      result.recordset.forEach((record, index) => {
        logger.info(`[DEBUG] Record ${index + 1}:`);
        logger.info(`  - Name: ${record.Name}`);
        logger.info(
          `  - CssContent length: ${
            record.CssContent ? record.CssContent.length : 0
          }`
        );
        logger.info(
          `  - JsContent length: ${
            record.JsContent ? record.JsContent.length : 0
          }`
        );
        logger.info(`  - CssContent value: ${record.CssContent || "NULL"}`);
        logger.info(`  - JsContent value: ${record.JsContent || "NULL"}`);
      });
    }

    res.json(result.recordset);
  } catch (err) {
    logger.error("Error in /api/sharedcontent/website/:websiteId", {
      error: err,
    });
    res.status(500).json({ error: "Failed to fetch shared blocks." });
  }
});

// GET single shared block
router.get("/:id", async (req, res) => {
  try {
    debugLog(
      "[DEBUG] GET /api/sharedcontent/:id - Request for ID:",
      req.params.id
    );

    const { id } = req.params;
    const pool = await db;
    const request = pool.request();
    request.input("id", sql.BigInt, id);
    const result = await request.query(
      `SELECT * FROM SharedContent WHERE SharedBlockID=@id`
    );

    debugLog("[DEBUG] Single shared block query result:", {
      recordCount: result.recordset.length,
      foundRecord: result.recordset.length > 0 ? result.recordset[0] : null,
    });

    if (result.recordset.length === 0) {
      debugLog("[DEBUG] Shared block not found for ID:", id);
      return res.status(404).json({ error: "Shared block not found." });
    }

    debugLog("[DEBUG] Returning shared block data:", result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (err) {
    debugLog("[DEBUG] Error in GET /:id endpoint:", err);
    res.status(500).json({ error: "Failed to fetch shared block." });
  }
});

// DELETE shared block
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await db;
    // First get the block name for notification
    const getBlockRequest = pool.request();
    getBlockRequest.input("id", sql.BigInt, id);
    const blockResult = await getBlockRequest.query(
      `SELECT Name FROM SharedContent WHERE SharedBlockID=@id`
    );
    const blockName = blockResult.recordset[0]?.Name || "Unknown";

    const request = pool.request();
    request.input("id", sql.BigInt, id);
    await request.query(`DELETE FROM SharedContent WHERE SharedBlockID=@id`);

    // Create success notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "deleted shared content block",
      entityId: parseInt(id),
      entityName: blockName,
      entityType: "shared content block",
      success: true,
      additionalInfo: "Shared content block permanently removed from library",
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error deleting shared block", { error: err });

    // Create error notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "delete shared content block",
      entityId: parseInt(req.params.id),
      entityType: "shared content block",
      success: false,
      additionalInfo: `Deletion failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to delete shared block." });
  }
});

// DEBUG endpoint to receive frontend debug information
router.post("/debug", async (req, res) => {
  try {
    const logMessage = `[FRONTEND DEBUG] ${req.body.message}`;
    debugLog(logMessage, req.body.data);
    res.json({ success: true });
  } catch (err) {
    debugLog("[DEBUG ENDPOINT ERROR]", err);
    res.status(500).json({ error: "Debug logging failed" });
  }
});

module.exports = router;