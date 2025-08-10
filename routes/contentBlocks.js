const express = require("express");
const router = express.Router();
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");
// const SyncQueue = require("../utils/syncQueue");
// const logger = require("../utils/logger");

// ===== SHARED CONTENT BLOCKS (ContentTemplates) ROUTES =====

// GET all shared content blocks for a website (API-safe: always JSON)
router.get(
  "/shared/:websiteId",
  (req, res, next) => {
    // If not authenticated, return JSON error instead of redirecting
    if (!req.session || !req.session.userInfo) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  },
  async (req, res) => {
    try {
      const pool = await db;
      const result = await pool
        .request()
        .input("WebsiteId", sql.BigInt, req.params.websiteId).query(`
        SELECT ID, Name, Description, HtmlContent, CssContent, JsContent,
               PreviewImageURL, CreatedAt, UpdatedAt
        FROM ContentTemplates
        WHERE IsReusable = 1 AND IsPublished = 1
        ORDER BY UpdatedAt DESC
      `);
      res.json(result.recordset);
    } catch (err) {
      logger.error("Error fetching shared content blocks", {
        error: err,
        websiteId: req.params.websiteId,
      });

      // Create error notification
      await NotificationService.notifyContentAction({
        req,
        action: "Fetch shared content blocks",
        success: false,
        additionalInfo: `Website ID: ${req.params.websiteId}`,
      });

      res.status(500).json({ error: "Failed to fetch shared content blocks." });
    }
  }
);

// GET a single shared content block
router.get("/shared/single/:id", async (req, res) => {
  try {
    const pool = await db;
    const result = await pool.request().input("ID", sql.Int, req.params.id)
      .query(`
        SELECT ID, Name, Description, HtmlContent, CssContent, JsContent,
               PreviewImageURL, CreatedAt, UpdatedAt
        FROM ContentTemplates
        WHERE ID = @ID AND IsReusable = 1
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Shared content block not found." });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    logger.error("Error fetching shared content block", {
      error: err,
      blockId: req.params.id,
    });
    res.status(500).json({ error: "Failed to fetch shared content block." });
  }
});

// CREATE a new shared content block
router.post("/shared", async (req, res) => {
  logger.info("🔧 BACKEND: POST /shared route hit");
  logger.info("🔧 BACKEND: Request body:", JSON.stringify(req.body, null, 2));

  const {
    name,
    slug,
    description,
    htmlContent,
    cssContent,
    jsContent,
    categoryId,
    authorId,
    previewImageURL,
    notes,
  } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: "Name and slug are required." });
  }

  try {
    // Check if slug already exists
    const pool = await db;
    const slugCheck = await pool
      .request()
      .input("Slug", sql.VarChar, slug)
      .query(
        "SELECT COUNT(*) as count FROM ContentTemplates WHERE Slug = @Slug"
      );

    if (slugCheck.recordset[0].count > 0) {
      return res.status(400).json({
        error: "Slug already exists. Please choose a different slug.",
      });
    }

    const result = await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .input("Slug", sql.VarChar, slug)
      .input("Description", sql.NVarChar, description || null)
      .input("HtmlContent", sql.NVarChar, htmlContent || "")
      .input("CssContent", sql.NVarChar, cssContent || "")
      .input("JsContent", sql.NVarChar, jsContent || "")
      .input("CategoryID", sql.Int, categoryId || null)
      .input("AuthorID", sql.Int, authorId || null)
      .input("PreviewImageURL", sql.NVarChar, previewImageURL || null)
      .input("Notes", sql.NVarChar, notes || null).query(`
        INSERT INTO ContentTemplates (
          Name, Slug, Description, HtmlContent, CssContent, JsContent,
          CategoryID, AuthorID, PreviewImageURL, Notes, Version, IsReusable,
          IsPublished, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.ID
        VALUES (
          @Name, @Slug, @Description, @HtmlContent, @CssContent, @JsContent,
          @CategoryID, @AuthorID, @PreviewImageURL, @Notes, 1, 1, 1,
          GETDATE(), GETDATE()
        )
      `);

    const newBlockId = result.recordset[0].ID;

    // Fetch the complete created block
    const createdBlock = await pool.request().input("ID", sql.Int, newBlockId)
      .query(`
        SELECT ID, Name, Description, HtmlContent, CssContent, JsContent,
               PreviewImageURL, CreatedAt, UpdatedAt
        FROM ContentTemplates
        WHERE ID = @ID
      `);

    // Create success notification
    await NotificationService.notifyContentAction({
      req,
      action: "Shared content block created",
      contentId: newBlockId,
      success: true,
      contentName: name,
    });

    res.status(201).json(createdBlock.recordset[0]);
  } catch (err) {
    logger.error("Error creating shared content block", { error: err });

    // Create error notification
    await NotificationService.notifyContentAction({
      req,
      action: "Create shared content block",
      success: false,
      contentName: name,
    });

    res.status(500).json({ error: "Failed to create shared content block." });
  }
});

// UPDATE a shared content block
router.put("/shared/:id", async (req, res) => {
  logger.info("🔧 BACKEND: PUT /shared/:id route hit");
  logger.info("🔧 BACKEND: ID:", req.params.id);
  logger.info("🔧 BACKEND: Request body:", JSON.stringify(req.body, null, 2));

  const {
    name,
    slug,
    description,
    htmlContent,
    cssContent,
    jsContent,
    categoryId,
    previewImageURL,
    notes,
    isPublished,
  } = req.body;

  try {
    // Check if slug already exists for other records
    const pool = await db;
    const slugCheck = await pool
      .request()
      .input("Slug", sql.VarChar, slug)
      .input("ID", sql.Int, req.params.id)
      .query(
        "SELECT COUNT(*) as count FROM ContentTemplates WHERE Slug = @Slug AND ID != @ID"
      );

    if (slugCheck.recordset[0].count > 0) {
      return res.status(400).json({
        error: "Slug already exists. Please choose a different slug.",
      });
    }

    await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .input("Name", sql.NVarChar, name)
      .input("Slug", sql.VarChar, slug)
      .input("Description", sql.NVarChar, description || null)
      .input("HtmlContent", sql.NVarChar, htmlContent || "")
      .input("CssContent", sql.NVarChar, cssContent || "")
      .input("JsContent", sql.NVarChar, jsContent || "")
      .input("CategoryID", sql.Int, categoryId || null)
      .input("PreviewImageURL", sql.NVarChar, previewImageURL || null)
      .input("Notes", sql.NVarChar, notes || null)
      .input(
        "IsPublished",
        sql.Bit,
        isPublished !== undefined ? isPublished : true
      ).query(`
        UPDATE ContentTemplates 
        SET Name = @Name, Slug = @Slug, Description = @Description,
            HtmlContent = @HtmlContent, CssContent = @CssContent, JsContent = @JsContent,
            CategoryID = @CategoryID, PreviewImageURL = @PreviewImageURL,
            Notes = @Notes, IsPublished = @IsPublished, UpdatedAt = GETDATE(),
            Version = Version + 1
        WHERE ID = @ID AND IsReusable = 1
      `);

    // Fetch the updated block
    const updatedBlock = await pool
      .request()
      .input("ID", sql.Int, req.params.id).query(`
        SELECT ID, Name, Description, HtmlContent, CssContent, JsContent,
               PreviewImageURL, CreatedAt, UpdatedAt
        FROM ContentTemplates
        WHERE ID = @ID
      `);

    if (updatedBlock.recordset.length === 0) {
      await NotificationService.notifyContentAction({
        req,
        action: "Update shared content block",
        contentId: parseInt(req.params.id),
        success: false,
        additionalInfo: "Content block not found",
      });
      return res.status(404).json({ error: "Shared content block not found." });
    }

    // Queue sync for all pages using this content template
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     await SyncQueue.queuePagesForContentTemplate(
    //       parseInt(req.params.id),
    //       req.user.AuthorID,
    //       `Shared content template updated: ${name}`
    //     );
    //     logger.info(
    //       `✅ Queued page sync for pages using content template ${req.params.id}`
    //     );
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for content template update", {
    //       error: syncError,
    //       contentTemplateId: req.params.id,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyContentAction({
      req,
      action: "Shared content block updated",
      contentId: parseInt(req.params.id),
      success: true,
      contentName: name,
    });

    res.json(updatedBlock.recordset[0]);
  } catch (err) {
    logger.error("Error updating shared content block", {
      error: err,
      blockId: req.params.id,
    });

    // Create error notification
    await NotificationService.notifyContentAction({
      req,
      action: "Update shared content block",
      contentId: parseInt(req.params.id),
      success: false,
      contentName: name,
    });

    res.status(500).json({ error: "Failed to update shared content block." });
  }
});

// DELETE a shared content block
router.delete("/shared/:id", async (req, res) => {
  try {
    // Check if the content block is being used in any pages
    const pool = await db;
    const usageCheck = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query(
        "SELECT COUNT(*) as count FROM PageContentBlocks WHERE ContentTemplateID = @ID"
      );

    if (usageCheck.recordset[0].count > 0) {
      return res.status(400).json({
        error:
          "Cannot delete shared content block as it is being used in pages.",
        inUse: true,
        usageCount: usageCheck.recordset[0].count,
      });
    }

    const result = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("DELETE FROM ContentTemplates WHERE ID = @ID AND IsReusable = 1");

    if (result.rowsAffected[0] === 0) {
      await NotificationService.notifyContentAction({
        req,
        action: "Delete shared content block",
        contentId: parseInt(req.params.id),
        success: false,
        additionalInfo: "Content block not found",
      });
      return res.status(404).json({ error: "Shared content block not found." });
    }

    // Create success notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "deleted shared content block",
      entityId: parseInt(req.params.id),
      entityType: "shared content block",
      success: true,
      additionalInfo: "Shared content block permanently removed from library",
    });

    res.json({
      success: true,
      message: "Shared content block deleted successfully.",
    });
  } catch (err) {
    logger.error("Error deleting shared content block", {
      error: err,
      blockId: req.params.id,
    });

    // Create error notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "delete shared content block",
      entityId: parseInt(req.params.id),
      entityType: "shared content block",
      success: false,
      additionalInfo: `Deletion failed: ${err.message}`,
    });

    res.status(500).json({ error: "Failed to delete shared content block." });
  }
});

// GET categories for dropdown
router.get("/categories", async (req, res) => {
  try {
    const pool = await db;
    const result = await pool
      .request()
      .query("SELECT CategoryID, Name FROM Categories ORDER BY Name");
    res.json(result.recordset);
  } catch (err) {
    logger.error("Error fetching categories", { error: err });
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});

// ===== EXISTING PAGE CONTENT BLOCKS ROUTES =====

// GET a single content template
router.get("/template/:id", async (req, res) => {
  try {
    const pool = await db;
    const result = await pool
      .request()
      .input("ID", sql.Int, req.params.id)
      .query("SELECT * FROM ContentTemplates WHERE ID = @ID");
    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Content template not found." });
    res.json(result.recordset[0]);
  } catch (err) {
    logger.error("Error fetching content template", {
      error: err,
      templateId: req.params.id,
    });
    res.status(500).json({ error: "Failed to fetch content template." });
  }
});

// CREATE a page content block from a content template or empty block
router.post("/page", async (req, res) => {
  logger.info("--- CREATE PAGE CONTENT BLOCK ---");
  logger.info("Request Body:", JSON.stringify(req.body, null, 2));

  const {
    pageId,
    placeholderId,
    sortOrder,
    isEmpty,
    isShared,
    blockType: clientBlockType,
  } = req.body;
  let { contentTemplateId } = req.body; // Use let instead of const for reassignment
  try {
    // Get database pool at the top of the function
    const pool = await db;

    let templateData;
    let contentName;

    if (isShared) {
      logger.info(
        `Processing as a SHARED CONTENT block with ID: ${contentTemplateId}`
      );
      // Get content from SharedContent table
      const sharedResult = await pool
        .request()
        .input("SharedBlockID", sql.Int, contentTemplateId)
        .query(
          "SELECT Name, HtmlContent, CssContent, JsContent FROM SharedContent WHERE SharedBlockID = @SharedBlockID"
        );
      if (sharedResult.recordset.length === 0) {
        logger.error(
          `Shared content block with ID ${contentTemplateId} not found.`
        );
        throw new Error("Shared content block not found");
      }
      templateData = sharedResult.recordset[0];
      contentName = templateData.Name;
      logger.info(`Shared content data fetched for '${contentName}'`);

      // Check if a ContentTemplate already exists for this shared block
      const sharedTemplateSlug = `shared-block-${contentTemplateId}`;
      const existingTemplateResult = await pool
        .request()
        .input("Slug", sql.VarChar, sharedTemplateSlug)
        .query(
          "SELECT ID, Name, HtmlContent, CssContent, JsContent FROM ContentTemplates WHERE Slug = @Slug"
        );

      if (existingTemplateResult.recordset.length > 0) {
        // Use existing ContentTemplate
        contentTemplateId = existingTemplateResult.recordset[0].ID;
        logger.info(
          `Using existing ContentTemplate with ID ${contentTemplateId} for shared block`
        );

        // Update the existing ContentTemplate with latest shared content
        await pool
          .request()
          .input("ID", sql.Int, contentTemplateId)
          .input("Name", sql.NVarChar, `Shared: ${templateData.Name}`)
          .input("HtmlContent", sql.NVarChar, templateData.HtmlContent)
          .input("CssContent", sql.NVarChar, templateData.CssContent)
          .input("JsContent", sql.NVarChar, templateData.JsContent)
          .input("UpdatedAt", sql.DateTime2, new Date())
          .query(
            "UPDATE ContentTemplates SET Name = @Name, HtmlContent = @HtmlContent, CssContent = @CssContent, JsContent = @JsContent, UpdatedAt = @UpdatedAt WHERE ID = @ID"
          );
        logger.info(
          `Updated ContentTemplate ${contentTemplateId} with latest shared content`
        );
      } else {
        // Create a new ContentTemplate for this shared block
        const sharedTemplateName = `Shared: ${templateData.Name}`;
        logger.info(
          `Creating ContentTemplate entry for shared block: ${sharedTemplateName} with slug: ${sharedTemplateSlug}`
        );

        const createSharedTemplateResult = await pool
          .request()
          .input("Name", sql.NVarChar, sharedTemplateName)
          .input("Slug", sql.VarChar, sharedTemplateSlug)
          .input("HtmlContent", sql.NVarChar, templateData.HtmlContent)
          .input("CssContent", sql.NVarChar, templateData.CssContent)
          .input("JsContent", sql.NVarChar, templateData.JsContent)
          .input("CreatedAt", sql.DateTime2, new Date())
          .input("UpdatedAt", sql.DateTime2, new Date())
          .query(
            "INSERT INTO ContentTemplates (Name, Slug, HtmlContent, CssContent, JsContent, CreatedAt, UpdatedAt) OUTPUT INSERTED.ID VALUES (@Name, @Slug, @HtmlContent, @CssContent, @JsContent, @CreatedAt, @UpdatedAt)"
          );

        contentTemplateId = createSharedTemplateResult.recordset[0].ID;
        logger.info(
          `Created ContentTemplate with ID ${contentTemplateId} for shared block`
        );
      }
    } else if (
      isEmpty ||
      clientBlockType === "empty" ||
      clientBlockType === "javascript" ||
      clientBlockType === "css"
    ) {
      const actualBlockType = clientBlockType || "empty";
      logger.info(`Processing as a ${actualBlockType.toUpperCase()} block.`);

      // Define template content based on block type
      let templateContent;
      switch (actualBlockType) {
        case "javascript":
          templateContent = {
            Name: "JavaScript Block",
            HtmlContent:
              '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #007bff; border-radius: 4px;"><p><i class="fab fa-js-square" style="font-size: 24px; margin-bottom: 10px; color: #f7df1e;"></i></p><p>JavaScript Block - Click \"Edit\" to add your JavaScript code</p></div>',
            CssContent: "",
            JsContent:
              "// Add your JavaScript code here\nlogger.info('JavaScript block loaded');",
          };
          break;
        case "css":
          templateContent = {
            Name: "CSS Block",
            HtmlContent:
              '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #28a745; border-radius: 4px;"><p><i class="fab fa-css3-alt" style="font-size: 24px; margin-bottom: 10px; color: #1572b6;"></i></p><p>CSS Block - Click \"Edit\" to add your CSS styles</p></div>',
            CssContent:
              "/* Add your CSS styles here */\n.my-custom-style {\n  color: #333;\n}",
            JsContent: "",
          };
          break;
        default: // empty
          templateContent = {
            Name: "Empty Content Block",
            HtmlContent:
              '<div style="padding: 20px; text-align: center; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 4px;"><p><i class="fas fa-edit" style="font-size: 24px; margin-bottom: 10px;"></i></p><p>Click \"Edit\" to add your content</p></div>',
            CssContent: "",
            JsContent: "",
          };
      }

      // Check if template exists for this block type
      logger.info(
        `Checking for existing '${templateContent.Name}' template...`
      );
      let blockTemplateResult = await pool
        .request()
        .input("Name", sql.NVarChar, templateContent.Name)
        .query(
          "SELECT ID, Name, HtmlContent, CssContent, JsContent FROM ContentTemplates WHERE Name = @Name AND IsReusable = 0"
        );

      if (blockTemplateResult.recordset.length === 0) {
        logger.info(
          `'${templateContent.Name}' template NOT found. Creating a new one.`
        );
        // Create the template with all required fields
        const slugMap = {
          "Empty Content Block": "empty-content-block",
          "JavaScript Block": "javascript-block",
          "CSS Block": "css-block",
        };
        const descriptionMap = {
          "Empty Content Block": "A blank, editable content block.",
          "JavaScript Block": "A JavaScript-focused content block.",
          "CSS Block": "A CSS-focused content block.",
        };

        const createResult = await pool
          .request()
          .input("Name", sql.NVarChar, templateContent.Name)
          .input("Slug", sql.VarChar, slugMap[templateContent.Name])
          .input(
            "Description",
            sql.NVarChar,
            descriptionMap[templateContent.Name]
          )
          .input("HtmlContent", sql.NVarChar, templateContent.HtmlContent)
          .input("CssContent", sql.NVarChar, templateContent.CssContent)
          .input("JsContent", sql.NVarChar, templateContent.JsContent)
          .input("CategoryID", sql.Int, null)
          .input("AuthorID", sql.Int, null)
          .input("PreviewImageURL", sql.NVarChar, null)
          .input(
            "Notes",
            sql.NVarChar,
            `Auto-generated template for ${actualBlockType} blocks.`
          )
          .input("Version", sql.Int, 1)
          .input("IsReusable", sql.Bit, 0)
          .input("IsPublished", sql.Bit, 1).query(`
            INSERT INTO ContentTemplates (
              Name, Slug, Description, HtmlContent, CssContent, JsContent,
              CategoryID, AuthorID, PreviewImageURL, Notes, Version, IsReusable,
              IsPublished, CreatedAt, UpdatedAt
            )
            OUTPUT INSERTED.ID
            VALUES (
              @Name, @Slug, @Description, @HtmlContent, @CssContent, @JsContent,
              @CategoryID, @AuthorID, @PreviewImageURL, @Notes, @Version, @IsReusable,
              @IsPublished, GETDATE(), GETDATE()
            )
          `);
        contentTemplateId = createResult.recordset[0].ID;
        templateData = templateContent;
        logger.info(
          `New '${templateContent.Name}' template created with ID: ${contentTemplateId}`
        );
      } else {
        // Use existing template
        contentTemplateId = blockTemplateResult.recordset[0].ID;
        templateData = blockTemplateResult.recordset[0];
        logger.info(
          `Found existing '${templateContent.Name}' template with ID: ${contentTemplateId}`
        );
      }
      contentName = templateContent.Name;
    } else {
      logger.info(
        `Processing as a TEMPLATE block with ID: ${contentTemplateId}`
      );
      // Get content from template
      const templateResult = await pool
        .request()
        .input("ID", sql.Int, contentTemplateId)
        .query(
          "SELECT Name, HtmlContent, CssContent, JsContent FROM ContentTemplates WHERE ID = @ID"
        );
      if (templateResult.recordset.length === 0) {
        logger.error(
          `Content template with ID ${contentTemplateId} not found.`
        );
        throw new Error("Content template not found");
      }
      templateData = templateResult.recordset[0];
      contentName = templateData.Name;
      logger.info(`Template data fetched for '${contentName}'`);
    }

    // Now we always have a valid contentTemplateId (either provided or created for empty blocks)
    logger.info(
      `Proceeding to create PageContentBlock with ContentTemplateID: ${contentTemplateId}`
    );
    const result = await pool
      .request()
      .input("PageID", sql.BigInt, pageId)
      .input("ContentTemplateID", sql.Int, contentTemplateId)
      .input("PlaceholderID", sql.NVarChar, placeholderId)
      .input("SortOrder", sql.Int, sortOrder)
      .input("HtmlContent", sql.NVarChar, templateData.HtmlContent)
      .input("CssContent", sql.NVarChar, templateData.CssContent)
      .input("JsContent", sql.NVarChar, templateData.JsContent)
      .query(
        "INSERT INTO PageContentBlocks (PageID, ContentTemplateID, PlaceholderID, SortOrder, HtmlContent, CssContent, JsContent) OUTPUT INSERTED.ID VALUES (@PageID, @ContentTemplateID, @PlaceholderID, @SortOrder, @HtmlContent, @CssContent, @JsContent)"
      );

    const newBlockId = result.recordset[0].ID;
    logger.info(
      `Successfully inserted into PageContentBlocks. New ID: ${newBlockId}`
    );

    const newBlock = {
      ...templateData,
      ID: newBlockId,
    };

    // Queue page sync for content block creation
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     // Get website ID for the page
    //     const pageResult = await pool
    //       .request()
    //       .input("PageID", sql.BigInt, pageId)
    //       .query("SELECT WebsiteID FROM Pages WHERE PageID = @PageID");

    //     if (pageResult.recordset.length > 0) {
    //       const websiteId = pageResult.recordset[0].WebsiteID;
    //       await SyncQueue.queuePageSync(
    //         pageId,
    //         websiteId,
    //         "UPDATE",
    //         req.user.AuthorID,
    //         `Content block added: ${contentName}`
    //       );
    //       logger.info(
    //         `✅ Queued page sync for content block creation on page ${pageId}`
    //       );
    //     }
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for content block creation", {
    //       error: syncError,
    //       pageId: pageId,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyContentAction({
      req,
      action:
        isEmpty || clientBlockType
          ? `${
              clientBlockType === "javascript"
                ? "JavaScript"
                : clientBlockType === "css"
                ? "CSS"
                : "Empty"
            } content block created`
          : isShared
          ? "Shared content block added to page"
          : "Page content block created",
      contentId: result.recordset[0].ID,
      success: true,
      contentName: contentName,
      additionalInfo: `Page ID: ${pageId}`,
    });

    logger.info("Sending final JSON response to client.");
    res.status(201).json(newBlock);
  } catch (err) {
    logger.error("Error in create page content block", {
      error: err,
      pageId: pageId,
      contentTemplateId: contentTemplateId,
    });
    // Create error notification
    await NotificationService.notifyContentAction({
      req,
      action: "Create page content block",
      success: false,
      additionalInfo: `Page ID: ${pageId}, Template ID: ${
        contentTemplateId || "empty"
      }. Error: ${err.message}`,
    });

    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// GET a page content block by ID
router.get("/page/:id", async (req, res) => {
  try {
    logger.info(`--- GET PAGE CONTENT BLOCK ${req.params.id} ---`);
    const pool = await db;
    const result = await pool
      .request()
      .input("ID", sql.BigInt, req.params.id)
      .query(
        "SELECT ID, HtmlContent, CssContent, JsContent, InstanceName FROM PageContentBlocks WHERE ID = @ID"
      );

    if (result.recordset.length === 0) {
      logger.info(`❌ Block ${req.params.id} not found`);
      return res.status(404).json({ error: "Block not found" });
    }

    const blockData = result.recordset[0];
    logger.info(`📄 Block ${req.params.id} data from database:`, {
      ID: blockData.ID,
      HtmlContentLength: blockData.HtmlContent?.length || 0,
      CssContentLength: blockData.CssContent?.length || 0,
      JsContentLength: blockData.JsContent?.length || 0,
      InstanceName: blockData.InstanceName,
      CssContent: blockData.CssContent,
      JsContent: blockData.JsContent,
    });

    res.json(blockData);
  } catch (err) {
    logger.error(`Error fetching block ${req.params.id}`, { error: err });
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a page content block
router.put("/page/:id", async (req, res) => {
  const { htmlContent, cssContent, jsContent, instanceName } = req.body;
  logger.info("--- UPDATE PAGE CONTENT BLOCK ---");
  logger.info("Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const pool = await db;
    const request = pool.request().input("ID", sql.BigInt, req.params.id);

    let setClauses = [];
    if (htmlContent !== undefined) {
      request.input("HtmlContent", sql.NVarChar, htmlContent);
      setClauses.push("HtmlContent = @HtmlContent");
    }
    if (cssContent !== undefined) {
      request.input("CssContent", sql.NVarChar, cssContent);
      setClauses.push("CssContent = @CssContent");
    }
    if (jsContent !== undefined) {
      request.input("JsContent", sql.NVarChar, jsContent);
      setClauses.push("JsContent = @JsContent");
    }
    if (instanceName !== undefined) {
      request.input("InstanceName", sql.NVarChar, instanceName);
      setClauses.push("InstanceName = @InstanceName");
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No updateable fields provided." });
    }

    const query = `UPDATE PageContentBlocks SET ${setClauses.join(
      ", "
    )} WHERE ID = @ID`;
    await request.query(query);

    // Queue page sync for content block update
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     // Get page and website info for the content block
    //     const blockInfoResult = await pool
    //       .request()
    //       .input("BlockID", sql.BigInt, req.params.id).query(`
    //         SELECT p.PageID, p.WebsiteID 
    //         FROM PageContentBlocks pcb
    //         JOIN Pages p ON pcb.PageID = p.PageID
    //         WHERE pcb.ID = @BlockID
    //       `);

    //     if (blockInfoResult.recordset.length > 0) {
    //       const { PageID, WebsiteID } = blockInfoResult.recordset[0];
    //       await SyncQueue.queuePageSync(
    //         PageID,
    //         WebsiteID,
    //         "UPDATE",
    //         req.user.AuthorID,
    //         `Content block updated (Block ID: ${req.params.id})`
    //       );
    //       logger.info(
    //         `✅ Queued page sync for content block update on page ${PageID}`
    //       );
    //     }
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for content block update", {
    //       error: syncError,
    //       blockId: req.params.id,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyContentAction({
      req,
      action: "Page content block updated",
      contentId: parseInt(req.params.id),
      success: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error updating page content block", {
      error: err,
      blockId: req.params.id,
    });
    // Create error notification
    await NotificationService.notifyContentAction({
      req,
      action: "Update page content block",
      contentId: parseInt(req.params.id),
      success: false,
    });

    res.status(500).json({ error: err.message });
  }
});

// UPDATE page content block position (for moving between zones)
router.put("/page/:id/position", async (req, res) => {
  try {
    logger.info(`🔄 UPDATE block position - ID: ${req.params.id}`);
    logger.info(`📦 Request body:`, req.body);

    const { id } = req.params;
    const { placeholderId, sortOrder } = req.body;

    if (!placeholderId || sortOrder === undefined) {
      return res.status(400).json({
        error: "placeholderId and sortOrder are required",
      });
    }

    // Update the block's position in the database
    const pool = await db;
    const result = await pool
      .request()
      .input("ID", sql.BigInt, id)
      .input("PlaceholderID", sql.NVarChar, placeholderId)
      .input("SortOrder", sql.Int, parseInt(sortOrder))
      .input("UpdatedAt", sql.DateTime2, new Date()).query(`
        UPDATE PageContentBlocks 
        SET PlaceholderID = @PlaceholderID, 
            SortOrder = @SortOrder, 
            UpdatedAt = @UpdatedAt
        WHERE ID = @ID
      `);

    logger.info(
      `✅ Updated block position - Rows affected: ${result.rowsAffected[0]}`
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Queue page sync for content block position change
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     // Get page and website info for the content block
    //     const blockInfoResult = await pool
    //       .request()
    //       .input("BlockID", sql.BigInt, id).query(`
    //         SELECT p.PageID, p.WebsiteID 
    //         FROM PageContentBlocks pcb
    //         JOIN Pages p ON pcb.PageID = p.PageID
    //         WHERE pcb.ID = @BlockID
    //       `);

    //     if (blockInfoResult.recordset.length > 0) {
    //       const { PageID, WebsiteID } = blockInfoResult.recordset[0];
    //       await SyncQueue.queuePageSync(
    //         PageID,
    //         WebsiteID,
    //         "UPDATE",
    //         req.user.AuthorID,
    //         `Content block moved to ${placeholderId} (Block ID: ${id})`
    //       );
    //       logger.info(
    //         `✅ Queued page sync for content block position change on page ${PageID}`
    //       );
    //     }
    //   }
    //   catch (syncError) {
    //     logger.error(
    //       "Failed to queue page sync for content block position change",
    //       {
    //         error: syncError,
    //         blockId: id,
    //       }
    //     );
    //   }
    // }

    res.json({
      success: true,
      message: "Block position updated successfully",
      placeholderId,
      sortOrder: parseInt(sortOrder),
    });
  } catch (err) {
    logger.error("Error updating block position", {
      error: err,
      blockId: req.params.id,
    });
    res.status(500).json({ error: "Failed to update block position" });
  }
});

// DELETE a page content block
router.delete("/page/:id", async (req, res) => {
  try {
    const pool = await db;

    // Get page and website info before deletion for sync queue
    let pageInfo = null;
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     const blockInfoResult = await pool
    //       .request()
    //       .input("BlockID", sql.BigInt, req.params.id).query(`
    //         SELECT p.PageID, p.WebsiteID 
    //         FROM PageContentBlocks pcb
    //         JOIN Pages p ON pcb.PageID = p.PageID
    //         WHERE pcb.ID = @BlockID
    //       `);

    //     if (blockInfoResult.recordset.length > 0) {
    //       pageInfo = blockInfoResult.recordset[0];
    //     }
    //   } catch (syncError) {
    //     logger.error("Failed to get page info for sync queue before deletion", {
    //       error: syncError,
    //       blockId: req.params.id,
    //     });
    //   }
    // }

    await pool
      .request()
      .input("ID", sql.BigInt, req.params.id)
      .query("DELETE FROM PageContentBlocks WHERE ID = @ID");

    // Queue page sync for content block deletion
    // if (pageInfo && req.user && req.user.AuthorID) {
    //   try {
    //     await SyncQueue.queuePageSync(
    //       pageInfo.PageID,
    //       pageInfo.WebsiteID,
    //       "UPDATE",
    //       req.user.AuthorID,
    //       `Content block deleted (Block ID: ${req.params.id})`
    //     );
    //     logger.info(
    //       `✅ Queued page sync for content block deletion on page ${pageInfo.PageID}`
    //     );
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for content block deletion", {
    //       error: syncError,
    //       blockId: req.params.id,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "deleted page content block",
      entityId: parseInt(req.params.id),
      entityType: "content block",
      success: true,
      additionalInfo: "Page content block permanently removed",
    });

    res.json({ success: true, message: "Block deleted" });
  } catch (err) {
    logger.error("Error deleting page content block", {
      error: err,
      blockId: req.params.id,
    });
    // Create error notification
    await NotificationService.notifyDeletionAction({
      req,
      action: "delete page content block",
      entityId: parseInt(req.params.id),
      entityType: "content block",
      success: false,
      additionalInfo: `Deletion failed: ${err.message}`,
    });

    res.status(500).json({ error: err.message });
  }
});

// UNSHARE a shared content block (convert to regular block)
router.post("/unshare/:id", async (req, res) => {
  try {
    logger.info(`--- UNSHARE SHARED CONTENT BLOCK ${req.params.id} ---`);
    const instanceId = req.params.id;

    // First, get the current PageContentBlock data
    const pool = await db;
    const blockResult = await pool.request().input("ID", sql.BigInt, instanceId)
      .query(`
        SELECT pcb.ID, pcb.PageID, pcb.ContentTemplateID, pcb.PlaceholderID, 
               pcb.SortOrder, pcb.HtmlContent, pcb.CssContent, pcb.JsContent, pcb.InstanceName,
               ct.Name, ct.Slug, ct.HtmlContent as TemplateHtml, 
               ct.CssContent as TemplateCss, ct.JsContent as TemplateJs
        FROM PageContentBlocks pcb
        INNER JOIN ContentTemplates ct ON pcb.ContentTemplateID = ct.ID
        WHERE pcb.ID = @ID
      `);

    if (blockResult.recordset.length === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    const blockData = blockResult.recordset[0];
    logger.info("📦 Current block data:", blockData);

    // Check if this is actually a shared block
    if (!blockData.Slug || !blockData.Slug.startsWith("shared-block-")) {
      return res
        .status(400)
        .json({ error: "This block is not a shared block" });
    }

    // For shared blocks, fetch the fresh content from SharedContent table
    let sharedContentData = null;
    let contentToUse = {
      html: blockData.TemplateHtml || "",
      css: blockData.TemplateCss || "",
      js: blockData.TemplateJs || "",
      name: blockData.Name || "Content Block",
    };

    // Extract shared block ID from slug
    const sharedBlockId = blockData.Slug.replace("shared-block-", "");
    logger.info(
      `🔍 Fetching fresh shared content for block ID: ${sharedBlockId}`
    );

    try {
      const sharedContentResult = await pool
        .request()
        .input("SharedBlockID", sql.BigInt, parseInt(sharedBlockId)).query(`
          SELECT Name, Description, HtmlContent, CssContent, JsContent
          FROM SharedContent
          WHERE SharedBlockID = @SharedBlockID
        `);

      if (sharedContentResult.recordset.length > 0) {
        sharedContentData = sharedContentResult.recordset[0];
        logger.info(`✅ Found fresh shared content:`, {
          name: sharedContentData.Name,
          htmlLength: (sharedContentData.HtmlContent || "").length,
          cssLength: (sharedContentData.CssContent || "").length,
          jsLength: (sharedContentData.JsContent || "").length,
        });

        // Use fresh shared content instead of potentially stale template content
        contentToUse = {
          html: sharedContentData.HtmlContent || "",
          css: sharedContentData.CssContent || "",
          js: sharedContentData.JsContent || "",
          name: sharedContentData.Name || "Content Block",
        };
      } else {
        logger.info(
          `⚠️ No SharedContent found for ID ${sharedBlockId}, using template content as fallback`
        );
      }
    } catch (sharedContentError) {
      logger.error(`Error fetching SharedContent for ID ${sharedBlockId}`, {
        error: sharedContentError,
      });
      logger.info(`⚠️ Using template content as fallback`);
    }

    // Create a new ContentTemplate with the fresh shared content
    const newTemplateName = `Unshared: ${contentToUse.name.replace(
      "Shared: ",
      ""
    )}`;
    const newTemplateSlug = `unshared-${instanceId}-${Date.now()}`;

    logger.info(`🆕 Creating new ContentTemplate: ${newTemplateName}`);
    logger.info(`🆕 Using content:`, {
      htmlLength: contentToUse.html.length,
      cssLength: contentToUse.css.length,
      jsLength: contentToUse.js.length,
    });

    const createTemplateResult = await pool
      .request()
      .input("Name", sql.NVarChar, newTemplateName)
      .input("Slug", sql.VarChar, newTemplateSlug)
      .input("HtmlContent", sql.NVarChar, contentToUse.html)
      .input("CssContent", sql.NVarChar, contentToUse.css)
      .input("JsContent", sql.NVarChar, contentToUse.js)
      .input("CreatedAt", sql.DateTime2, new Date())
      .input("UpdatedAt", sql.DateTime2, new Date()).query(`
        INSERT INTO ContentTemplates (Name, Slug, HtmlContent, CssContent, JsContent, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.ID
        VALUES (@Name, @Slug, @HtmlContent, @CssContent, @JsContent, @CreatedAt, @UpdatedAt)
      `);

    const newContentTemplateId = createTemplateResult.recordset[0].ID;
    logger.info(
      `✅ Created new ContentTemplate with ID: ${newContentTemplateId}`
    );

    // Update the PageContentBlock to reference the new ContentTemplate and update the instance name
    const newInstanceName = contentToUse.name.replace("Shared: ", "");

    await pool
      .request()
      .input("ID", sql.BigInt, instanceId)
      .input("ContentTemplateID", sql.Int, newContentTemplateId)
      .input("InstanceName", sql.NVarChar, newInstanceName)
      .input("UpdatedAt", sql.DateTime2, new Date()).query(`
        UPDATE PageContentBlocks 
        SET ContentTemplateID = @ContentTemplateID, InstanceName = @InstanceName, UpdatedAt = @UpdatedAt
        WHERE ID = @ID
      `);

    logger.info(
      `✅ Updated PageContentBlock instance name to: ${newInstanceName}`
    );

    logger.info(
      `✅ Updated PageContentBlock ${instanceId} to reference new ContentTemplate ${newContentTemplateId}`
    );

    // Queue page sync for content block unshare
    // if (req.user && req.user.AuthorID) {
    //   try {
    //     // Get page and website info for the content block
    //     const blockInfoResult = await pool
    //       .request()
    //       .input("BlockID", sql.BigInt, instanceId).query(`
    //         SELECT p.PageID, p.WebsiteID 
    //         FROM PageContentBlocks pcb
    //         JOIN Pages p ON pcb.PageID = p.PageID
    //         WHERE pcb.ID = @BlockID
    //       `);

    //     if (blockInfoResult.recordset.length > 0) {
    //       const { PageID, WebsiteID } = blockInfoResult.recordset[0];
    //       await SyncQueue.queuePageSync(
    //         PageID,
    //         WebsiteID,
    //         "UPDATE",
    //         req.user.AuthorID,
    //         `Shared content block unshared (Block ID: ${instanceId})`
    //       );
    //       logger.info(
    //         `✅ Queued page sync for content block unshare on page ${PageID}`
    //       );
    //     }
    //   } catch (syncError) {
    //     logger.error("Failed to queue page sync for content block unshare", {
    //       error: syncError,
    //       blockId: instanceId,
    //     });
    //   }
    // }

    // Create success notification
    await NotificationService.notifyContentAction({
      req,
      action: "Shared content block unshared",
      contentId: parseInt(instanceId),
      success: true,
      additionalInfo: `Created new ContentTemplate ID: ${newContentTemplateId}`,
    });

    res.json({
      success: true,
      message: "Block unshared successfully",
      newContentTemplateId: newContentTemplateId,
      newTemplateName: newTemplateName,
    });
  } catch (err) {
    logger.error(`Error unsharing block ${req.params.id}`, { error: err });

    // Create error notification
    await NotificationService.notifyContentAction({
      req,
      action: "Unshare shared content block",
      contentId: parseInt(req.params.id),
      success: false,
      additionalInfo: `Error: ${err.message}`,
    });

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;