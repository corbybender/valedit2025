const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");
// const SyncQueue = require("../utils/syncQueue");
// const logger = require("../utils/logger");

router.get("/categorized", async (req, res) => {
  try {
    const pool = await db;
    const categoriesResult = await pool.request()
      .query`SELECT ID, Name FROM PageTemplateCategories ORDER BY Name`;
    const templatesResult = await pool.request()
      .query`SELECT ID, Name, CategoryID FROM PageTemplates ORDER BY Name`;
    const categoriesMap = new Map(
      categoriesResult.recordset.map((c) => [
        c.ID,
        {
          categoryId: c.ID,
          categoryName: c.Name,
          templates: [],
        },
      ])
    );
    templatesResult.recordset.forEach((t) => {
      if (t.CategoryID && categoriesMap.has(t.CategoryID)) {
        categoriesMap.get(t.CategoryID).templates.push(t);
      }
    });
    res.json(Array.from(categoriesMap.values()));
  } catch (err) {
    res.status(500).json({ error: "Failed to load categorized templates." });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const pool = await db;
    const result = await pool.request()
      .query`SELECT ID, Name FROM PageTemplateCategories ORDER BY Name`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to load categories." });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    const pool = await db;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .query(
        "INSERT INTO PageTemplateCategories (Name) OUTPUT INSERTED.ID, INSERTED.Name VALUES (@Name)"
      );

    // Create success notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Template category created",
      templateId: result.recordset[0].ID,
      templateName: name,
      success: true,
      additionalInfo: `Category: ${name}`,
    });

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    // Create error notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Create template category",
      templateName: name,
      success: false,
      additionalInfo: `Category creation failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to create category." });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const pool = await db;
    await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .input("Name", sql.NVarChar, name)
      .query("UPDATE PageTemplateCategories SET Name = @Name WHERE ID = @ID");

    // Create success notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Template category updated",
      templateId: parseInt(req.params.id),
      templateName: name,
      success: true,
      additionalInfo: `Category renamed to: ${name}`,
    });

    res.json({ success: true });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Update template category",
      templateId: parseInt(req.params.id),
      templateName: name,
      success: false,
      additionalInfo: `Category update failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to update category." });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const pool = await db;
    // First get the category name for notification
    const getCategoryResult = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("SELECT Name FROM PageTemplateCategories WHERE ID = @ID");
    const categoryName = getCategoryResult.recordset[0]?.Name || "Unknown";

    const checkResult = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query(
        "SELECT COUNT(*) as count FROM PageTemplates WHERE CategoryID = @ID"
      );
    if (checkResult.recordset[0].count > 0) {
      // Create error notification for in-use category
      await NotificationService.notifyDeletionAction({
        req,
        action: "delete template category",
        entityId: parseInt(req.params.id),
        entityName: categoryName,
        entityType: "template category",
        success: false,
        additionalInfo:
          "Cannot delete category: It is currently in use by one or more templates",
      });

      return res.status(400).json({
        error:
          "Cannot delete category: It is currently in use by one or more templates.",
      });
    }
    await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("DELETE FROM PageTemplateCategories WHERE ID = @ID");

    // Create success notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "deleted template category",
      entityId: parseInt(req.params.id),
      entityName: categoryName,
      entityType: "template category",
      success: true,
      additionalInfo: "Template category permanently removed",
    });

    res.json({ success: true });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "delete template category",
      entityId: parseInt(req.params.id),
      entityType: "template category",
      success: false,
      additionalInfo: `Deletion failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to delete category." });
  }
});

router.post("/", async (req, res) => {
  const { Name, Description, HtmlStructure, CategoryID } = req.body;
  try {
    const pool = await db;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar, Name)
      .input("Description", sql.NVarChar, Description)
      .input("HtmlStructure", sql.NVarChar, HtmlStructure)
      .input("CategoryID", sql.Int, CategoryID)
      .query(
        "INSERT INTO PageTemplates (Name, Description, HtmlStructure, CategoryID) OUTPUT INSERTED.ID VALUES (@Name, @Description, @HtmlStructure, @CategoryID)"
      );

    // Create success notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Page template created",
      templateId: result.recordset[0].ID,
      templateName: Name,
      success: true,
      additionalInfo: `Template: ${Name} - ${Description || "No description"}`,
    });

    res.status(201).json({ success: true, id: result.recordset[0].ID });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Create page template",
      templateName: Name,
      success: false,
      additionalInfo: `Template creation failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to create page template." });
  }
});

router.put("/:id", async (req, res) => {
  const { Name, Description, HtmlStructure, CategoryID } = req.body;
  try {
    const pool = await db;
    await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .input("Name", sql.NVarChar, Name)
      .input("Description", sql.NVarChar, Description)
      .input("HtmlStructure", sql.NVarChar, HtmlStructure)
      .input("CategoryID", sql.Int, CategoryID)
      .query(
        "UPDATE PageTemplates SET Name = @Name, Description = @Description, HtmlStructure = @HtmlStructure, CategoryID = @CategoryID WHERE ID = @ID"
      );

    // Queue sync for all pages using this template
    // const authorID = req.session?.authorID || res.locals?.authorID;
    // if (authorID) {
    //   try {
    //     await SyncQueue.queuePagesForTemplate(
    //       parseInt(req.params.id),
    //       authorID,
    //       `Page template updated: ${Name}`
    //     );
    //     logger.info(
    //       `✅ Queued page sync for pages using template ${req.params.id}`
    //     );
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for template update", {
    //       error: syncError,
    //       templateId: req.params.id,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Page template updated",
      templateId: parseInt(req.params.id),
      templateName: Name,
      success: true,
      additionalInfo: `Template: ${Name} - ${Description || "No description"}`,
    });

    res.json({ success: true });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Update page template",
      templateId: parseInt(req.params.id),
      templateName: Name,
      success: false,
      additionalInfo: `Template update failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to update page template." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    logger.info(`🔍 DEBUG: Fetching page template with ID: ${req.params.id}`);

    const pool = await db;
    const result = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("SELECT * FROM PageTemplates WHERE ID = @ID");

    logger.info(
      `🔍 DEBUG: Page template query result count: ${result.recordset.length}`
    );

    if (result.recordset.length === 0) {
      logger.info(`❌ DEBUG: Page template not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Page template not found." });
    }

    logger.info(
      `✅ DEBUG: Page template found: ${result.recordset[0].Name} (ID: ${result.recordset[0].ID})`
    );
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("❌ DEBUG: Error fetching page template:", err);
    console.error("❌ DEBUG: Error stack:", err.stack);
    res
      .status(500)
      .json({ error: "Failed to fetch page template.", details: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const pool = await db;
    // First get the template name for notification
    const getTemplateResult = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("SELECT Name FROM PageTemplates WHERE ID = @ID");
    const templateName = getTemplateResult.recordset[0]?.Name || "Unknown";

    // Queue sync for all pages using this template before deletion
    // const authorID = req.session?.authorID || res.locals?.authorID;
    // if (authorID) {
    //   try {
    //     await SyncQueue.queuePagesForTemplate(
    //       parseInt(req.params.id),
    //       authorID,
    //       `Page template deleted: ${templateName} - pages need template reassignment`
    //     );
    //     logger.info(
    //       `✅ Queued page sync for pages using deleted template ${req.params.id}`
    //     );
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for template deletion", {
    //       error: syncError,
    //       templateId: req.params.id,
    //     });
    //   }
    // }

    await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("DELETE FROM PageTemplates WHERE ID = @ID");

    // Create success notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "deleted page template",
      entityId: parseInt(req.params.id),
      entityName: templateName,
      entityType: "page template",
      success: true,
      additionalInfo: "Page template permanently removed",
    });

    res.json({ success: true });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "delete page template",
      entityId: parseInt(req.params.id),
      entityType: "page template",
      success: false,
      additionalInfo: `Deletion failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to delete page template." });
  }
});

// Duplicate page template
router.post("/:id/duplicate", async (req, res) => {
  try {
    const { newName, categoryId } = req.body;
    const sourceId = req.params.id;
    
    if (!newName) {
      return res.status(400).json({ error: "New template name is required." });
    }

    const pool = await db;
    
    // First get the source template
    const sourceResult = await pool
      .request()
      .input("ID", sql.Int, sourceId)
      .query("SELECT Name, Description, HtmlStructure FROM PageTemplates WHERE ID = @ID");

    if (sourceResult.recordset.length === 0) {
      return res.status(404).json({ error: "Source template not found." });
    }

    const sourceTemplate = sourceResult.recordset[0];
    
    // Create the duplicate
    const result = await pool
      .request()
      .input("Name", sql.NVarChar, newName)
      .input("Description", sql.NVarChar, `Copy of ${sourceTemplate.Description || sourceTemplate.Name}`)
      .input("HtmlStructure", sql.NVarChar, sourceTemplate.HtmlStructure)
      .input("CategoryID", sql.Int, categoryId || null)
      .query(
        "INSERT INTO PageTemplates (Name, Description, HtmlStructure, CategoryID) OUTPUT INSERTED.ID VALUES (@Name, @Description, @HtmlStructure, @CategoryID)"
      );

    // Create success notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Page template duplicated",
      templateId: result.recordset[0].ID,
      templateName: newName,
      success: true,
      additionalInfo: `Duplicated from "${sourceTemplate.Name}" to "${newName}"`,
    });

    res.status(201).json({ 
      success: true, 
      id: result.recordset[0].ID,
      message: `Template duplicated successfully as "${newName}"` 
    });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyTemplateAction({
      req,
      action: "Duplicate page template",
      templateName: newName || "Unknown",
      success: false,
      additionalInfo: `Template duplication failed: ${err.message}`,
    });

    if (err.number === 2627) {
      // Unique constraint violation
      res.status(400).json({ error: "A template with this name already exists." });
    } else {
      res.status(500).json({ error: "Failed to duplicate page template." });
    }
  }
});

// Get ContentTemplates (for shared content blocks)
router.get("/contentTemplates", async (req, res) => {
  try {
    const pool = await db;
    const result = await pool.request().query(`
      SELECT 
        ID,
        Name,
        Description,
        HtmlContent,
        CssContent,
        JsContent,
        PreviewImageURL,
        CreatedAt,
        UpdatedAt
      FROM ContentTemplates
      WHERE IsPublished = 1
      ORDER BY UpdatedAt DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching content templates:", err);
    res.status(500).json({ error: "Failed to fetch content templates." });
  }
});

module.exports = router;