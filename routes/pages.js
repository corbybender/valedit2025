const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const db = require("../db");
const sql = require("mssql");
const NotificationService = require("../src/services/notificationService");
// const SyncQueue = require("../utils/syncQueue");
// const logger = require("../utils/logger");

// Publish a page
router.post("/:id/publish", async (req, res) => {
  const pageId = req.params.id;
  logger.info(`--- PUBLISH PAGE ${pageId} ---`);
  const { zoneContent } = req.body;
  logger.info("Received zoneContent:", JSON.stringify(zoneContent, null, 2));

  if (!zoneContent) {
    return res.status(400).json({ error: "zoneContent is required." });
  }
  try {
    const pool = await db;
    const pageResult = await pool.request().input("PageID", sql.BigInt, pageId)
      .query(`
        SELECT p.PageTemplateID, p.Title, p.URL, p.Path, w.Domain, p.WebsiteID
        FROM Pages p
        LEFT JOIN Websites w ON p.WebsiteID = w.WebsiteID
        WHERE p.PageID = @PageID`);

    if (pageResult.recordset.length === 0) throw new Error("Page not found.");
    const pageData = pageResult.recordset[0];
    logger.info("Page data fetched:", pageData.Title);

    // Debug authentication data
    logger.info("🔍 Authentication Debug for Publish:", {
      sessionAuthorID: req.session?.authorID,
      localsAuthorID: res.locals?.authorID,
      sessionUserInfo: req.session?.userInfo,
      localsUser: res.locals?.user,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      localsKeys: res.locals ? Object.keys(res.locals) : [],
    });

    // Manually queue the page sync
    const authorID = req.session?.authorID || res.locals?.authorID;
    if (authorID) {
      logger.info(
        `🔄 Attempting to queue page sync for PageID: ${pageId}, AuthorID: ${authorID}`
      );
      // try {
      //   const syncQueueId = await SyncQueue.queuePageSync(
      //     pageId,
      //     pageData.WebsiteID,
      //     "UPDATE",
      //     authorID,
      //     "Page published"
      //   );
      //   logger.info(`✅ Successfully queued page sync with ID: ${syncQueueId}`);
      // } catch (err) {
      //   logger.error("Failed to queue page sync on publish", {
      //     error: err,
      //     pageId: pageId,
      //     authorID: authorID,
      //   });
      // }
    } else {
      logger.info("⚠️ No user authentication found - skipping sync queue", {
        sessionAuthorID: req.session?.authorID,
        localsAuthorID: res.locals?.authorID,
        hasSession: !!req.session,
        hasUserInfo: !!req.session?.userInfo,
      });
    }

    const templateResult = await pool
      .request()
      .input("TemplateID", sql.Int, pageData.PageTemplateID)
      .query("SELECT HtmlStructure FROM PageTemplates WHERE ID = @TemplateID");

    if (templateResult.recordset.length === 0)
      throw new Error("Page Template not found.");
    logger.info("Page layout template fetched.");

    const allTemplateIds = Object.values(zoneContent)
      .flat()
      .map((item) => item.id)
      .filter(
        (id) =>
          id &&
          id !== "empty" &&
          id !== "javascript" &&
          id !== "css" &&
          !isNaN(parseInt(id))
      ); // Filter out null, undefined, "empty", "javascript", "css", and non-numeric values

    logger.info("Filtered numeric template IDs for query:", allTemplateIds);

    let contentTemplateMap = {};
    if (allTemplateIds.length > 0) {
      logger.info("Fetching content templates from DB...");
      const contentTemplatesResult = await pool
        .request()
        .query(
          `SELECT ID, Name, HtmlContent, CssContent, JsContent FROM ContentTemplates WHERE ID IN (${allTemplateIds.join(
            ","
          )})`
        );
      contentTemplateMap = contentTemplatesResult.recordset.reduce((map, t) => {
        map[t.ID] = t;
        return map;
      }, {});
      logger.info(
        `Mapped ${Object.keys(contentTemplateMap).length} content templates.`
      );
    }

    const $ = cheerio.load(templateResult.recordset[0].HtmlStructure, {
      decodeEntities: false,
    });

    logger.info("Processing zones with Cheerio...");
    for (const zoneId in zoneContent) {
      const placeholder = $(`#${zoneId}`);
      if (placeholder.length) {
        logger.info(`- Found placeholder for zone: #${zoneId}`);
        const blocks = zoneContent[zoneId];
        const finalContent = blocks
          .map((block) => {
            if (
              block.id === "empty" ||
              block.id === "javascript" ||
              block.id === "css"
            ) {
              logger.info(`  - Handling '${block.id}' block.`);
              // These blocks store their content in PageContentBlocks, not templates
              // For publishing, we need to fetch their actual content
              // For now, return a placeholder div - this could be enhanced to fetch the actual content
              return `<div data-block-type="${block.id}"><!-- ${block.id} block content --></div>`;
            }
            const template = contentTemplateMap[block.id];
            if (template) {
              logger.info(
                `  - Appending template ID: ${block.id} ('${template.Name}')`
              );
              return `<div data-template-id="${template.ID}">${template.HtmlContent}</div>`;
            }
            return "";
          })
          .join("");
        placeholder.html(finalContent);
      } else {
        logger.warn(`Placeholder not found for zone: #${zoneId}`, {
          zoneId: zoneId,
        });
      }
    }

    const finalHtml = $.html();
    logger.info("Final HTML generated. Length:", finalHtml.length);

    // Here you would typically save the finalHtml to a file or another database table.
    // For this example, we'll just log it and send success.

    // Create success notification
    await NotificationService.notifyPublishAction({
      req,
      action: "Page published",
      pageId: parseInt(pageId),
      pageName: pageData.Title,
      success: true,
      publishType: "page",
      additionalInfo: `Published to URL: ${pageData.URL || pageData.Path}`,
    });

    res.status(200).json({ message: "Page published successfully." });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyPublishAction({
      req,
      action: "Page publish",
      pageId: parseInt(pageId),
      success: false,
      publishType: "page",
      additionalInfo: `Publish failed: ${err.message}`,
    });

    logger.error("Error during page publish", {
      error: err,
      pageId: pageId,
    });
    res
      .status(500)
      .json({ error: "Failed to publish page.", details: err.message });
  }
});

// Create a new page
router.post("/", async (req, res) => {
  const { name, pageLayoutId, websiteId, url, path } = req.body;
  try {
    const pool = await db;
    const result = await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .input("PageLayoutID", sql.Int, pageLayoutId)
      .input("WebsiteID", sql.Int, websiteId)
      .input("URL", sql.NVarChar, url)
      .input("Path", sql.NVarChar, path).query(`
        INSERT INTO Pages (Title, PageTemplateID, WebsiteID, URL, Path)
        OUTPUT INSERTED.PageID, INSERTED.Title
        VALUES (@Name, @PageLayoutID, @WebsiteID, @URL, @Path)`);

    const newPage = result.recordset[0];

    // Manually queue the page sync
    const authorID = req.session?.authorID || res.locals?.authorID;
    if (authorID) {
      logger.info(
        `🔄 Attempting to queue page sync for new PageID: ${newPage.PageID}, AuthorID: ${authorID}`
      );
      // try {
      //   const syncQueueId = await SyncQueue.queuePageSync(
      //     newPage.PageID,
      //     websiteId,
      //     "CREATE",
      //     authorID,
      //     "Page created"
      //   );
      //   logger.info(`✅ Successfully queued page sync with ID: ${syncQueueId}`);
      // } catch (err) {
      //   logger.error("Failed to queue page sync on create", {
      //     error: err,
      //     pageId: newPage.PageID,
      //     authorID: authorID,
      //   });
      // }
    } else {
      logger.info("⚠️ No user authentication found - skipping sync queue", {
        sessionAuthorID: req.session?.authorID,
        localsAuthorID: res.locals?.authorID,
        hasSession: !!req.session,
        hasUserInfo: !!req.session?.userInfo,
      });
    }

    // Create success notification
    await NotificationService.notifyPageAction({
      req,
      action: "Page created",
      pageId: newPage.PageID,
      success: true,
      pageName: name,
    });

    res.status(201).json({ PageID: newPage.PageID, Name: newPage.Title });
  } catch (err) {
    // Create error notification
    await NotificationService.notifyPageAction({
      req,
      action: "Page creation",
      success: false,
      pageName: name,
      additionalInfo: err.message,
    });

    logger.error("Failed to create page", { error: err, pageName: name });
    res
      .status(500)
      .json({ error: "Failed to create page.", details: err.message });
  }
});

// Get all page paths for a website
router.get("/paths/:websiteId", async (req, res) => {
  try {
    const { websiteId } = req.params;
    const pool = await db;
    const result = await pool.request().query(`
      SELECT DISTINCT Path FROM Pages
      WHERE WebsiteID = ${websiteId} AND Path IS NOT NULL AND Path <> ''`);

    const paths = result.recordset.map((row) => row.Path);
    res.json(paths);
  } catch (error) {
    logger.error("Failed to fetch paths", {
      error: error,
      websiteId: req.params.websiteId,
    });
    res.status(500).json({ error: "Failed to fetch paths" });
  }
});

// GET a single page with its content blocks
router.get("/:id", async (req, res) => {
  try {
    const pageId = req.params.id;
    logger.info(`🔍 DEBUG: Fetching page with ID: ${pageId}`);

    // Get page details
    const pool = await db;
    const pageResult = await pool.request().input("PageID", sql.BigInt, pageId)
      .query(`
        SELECT p.*, w.Domain as Hostname
        FROM Pages p
        JOIN Websites w ON p.WebsiteID = w.WebsiteID
        WHERE p.PageID = @PageID
      `);

    logger.info(
      `🔍 DEBUG: Page query result count: ${pageResult.recordset.length}`
    );

    if (pageResult.recordset.length === 0) {
      logger.info(`❌ DEBUG: Page not found for ID: ${pageId}`);
      return res.status(404).json({ error: "Page not found" });
    }
    const page = pageResult.recordset[0];
    logger.info(`✅ DEBUG: Page found: ${page.Title} (ID: ${page.PageID})`);

    // Get content blocks for the page
    logger.info(`🔍 DEBUG: Fetching content blocks for page ID: ${pageId}`);
    const blocksResult = await pool
      .request()
      .input("PageID", sql.BigInt, pageId).query(`
        SELECT 
          pcb.ID,
          pcb.PageID,
          pcb.ContentTemplateID,
          pcb.PlaceholderID,
          pcb.SortOrder,
          pcb.InstanceName, 
          ct.Name as Name
        FROM PageContentBlocks pcb
        LEFT JOIN ContentTemplates ct ON pcb.ContentTemplateID = ct.ID
        WHERE pcb.PageID = @PageID
        ORDER BY pcb.SortOrder
      `);

    logger.info(
      `🔍 DEBUG: Content blocks query result count: ${blocksResult.recordset.length}`
    );
    if (blocksResult.recordset.length > 0) {
      logger.info(`🔍 DEBUG: First block:`, blocksResult.recordset[0]);
    }

    page.blocks = blocksResult.recordset;

    // Get sync status for the page
    // try {
    //   page.syncStatus = await SyncQueue.getPageSyncStatus(pageId);
    //   logger.info(`🔍 DEBUG: Sync status:`, page.syncStatus);
    // } catch (error) {
    //   logger.error("Error fetching sync status", {
    //     error: error,
    //     pageId: pageId,
    //   });
    //   page.syncStatus = null;
    // }

    logger.info(
      `✅ DEBUG: Sending page response with ${page.blocks.length} blocks`
    );
    res.json(page);
  } catch (err) {
    logger.error("Error fetching page details", {
      error: err,
      pageId: req.params.id,
    });
    res.status(500).json({ error: "Failed to fetch page details." });
  }
});

// Preview a page with its template and content
router.get("/:id/preview", async (req, res) => {
  const pageId = req.params.id;
  logger.info(`--- PREVIEW PAGE ${pageId} ---`);

  try {
    const pool = await db;

    // Get page details with template information
    const pageResult = await pool.request().input("PageID", sql.BigInt, pageId)
      .query(`
        SELECT 
          p.PageID,
          p.Title,
          p.URL,
          p.Path,
          p.PageTemplateID,
          p.WebsiteID,
          w.Domain as Hostname,
          pt.Name as TemplateName,
          pt.HtmlStructure as TemplateHTML
        FROM Pages p
        JOIN Websites w ON p.WebsiteID = w.WebsiteID
        LEFT JOIN PageTemplates pt ON p.PageTemplateID = pt.ID
        WHERE p.PageID = @PageID
      `);

    if (pageResult.recordset.length === 0) {
      return res.status(404).send("Page not found");
    }

    const page = pageResult.recordset[0];
    logger.info(`✅ Preview: Page found: ${page.Title} (ID: ${page.PageID})`);

    // Get content blocks for the page
    const blocksResult = await pool
      .request()
      .input("PageID", sql.BigInt, pageId).query(`
        SELECT 
          pcb.ID,
          pcb.PageID,
          pcb.ContentTemplateID,
          pcb.PlaceholderID,
          pcb.SortOrder,
          pcb.InstanceName,
          pcb.HtmlContent,
          pcb.CssContent,
          pcb.JsContent,
          ct.Name as BlockName,
          ct.HtmlContent as BlockTemplateHTML
        FROM PageContentBlocks pcb
        LEFT JOIN ContentTemplates ct ON pcb.ContentTemplateID = ct.ID
        WHERE pcb.PageID = @PageID
        ORDER BY pcb.SortOrder
      `);

    page.blocks = blocksResult.recordset;
    logger.info(`✅ Preview: Found ${page.blocks.length} content blocks`);

    // Start with the template HTML or a basic structure
    let html =
      page.TemplateHTML ||
      `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.Title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      .preview-notice { background: #f0f9ff; border: 1px solid #0ea5e9; color: #0c4a6e; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
      .content-block { margin: 20px 0; padding: 15px; border: 1px dashed #ccc; background: #f9f9f9; }
      .block-title { font-weight: bold; color: #666; margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <div class="preview-notice">
      <strong>Preview Mode:</strong> This is a preview of "${page.Title}" with current database content.
    </div>
    <h1>${page.Title}</h1>
    <div id="content-area">
      <!-- Content blocks will be inserted here -->
    </div>
  </body>
  </html>
`;
    // Replace common template variables
    html = html.replace(/\{\{title\}\}/g, page.Title);
    html = html.replace(/\{\{url\}\}/g, page.URL || "");
    html = html.replace(/\{\{path\}\}/g, page.Path || "");
    html = html.replace(/\{\{hostname\}\}/g, page.Hostname || "");
    // Process content blocks and replace placeholders
    if (page.blocks && page.blocks.length > 0) {
      // Group blocks by placeholder ID
      const blocksByPlaceholder = {};

      for (const block of page.blocks) {
        const placeholderId = block.PlaceholderID;
        if (!blocksByPlaceholder[placeholderId]) {
          blocksByPlaceholder[placeholderId] = [];
        }
        blocksByPlaceholder[placeholderId].push(block);
      }

      // Replace each placeholder with its content
      for (const [placeholderId, blocks] of Object.entries(
        blocksByPlaceholder
      )) {
        let placeholderHtml = "";

        for (const block of blocks) {
          // Use the block's own HTML content first, then fall back to template HTML
          let blockHtml =
            block.HtmlContent ||
            block.BlockTemplateHTML ||
            `<div class="content-block">
            <div class="block-title">${
              block.BlockName || block.InstanceName || "Content Block"
            }</div>
            <div>${block.HtmlContent || "No content available"}</div>
          </div>`;

          // Add CSS if present
          let blockCss = "";
          if (block.CssContent) {
            blockCss = `<style>${block.CssContent}</style>`;
          }

          // Add JavaScript if present
          let blockJs = "";
          if (block.JsContent) {
            blockJs = `<script>${block.JsContent}</script>`;
          }

          placeholderHtml += blockCss + blockHtml + blockJs;
        }

        // Replace the placeholder div with actual content
        const placeholderSelector = `<div class="layout-placeholder" id="${placeholderId}">`;
        const placeholderRegex = new RegExp(
          `<div class="layout-placeholder" id="${placeholderId}">[^<]*</div>`,
          "gi"
        );

        if (html.includes(placeholderSelector)) {
          html = html.replace(placeholderRegex, placeholderHtml);
        }
      }

      // Remove all remaining empty placeholders
      html = html.replace(
        /<div class="layout-placeholder"[^>]*>.*?<\/div>/gi,
        ""
      );
    }

    // Replace common template variables
    html = html.replace(/\{\{title\}\}/g, page.Title);
    html = html.replace(/\{\{url\}\}/g, page.URL || "");
    html = html.replace(/\{\{path\}\}/g, page.Path || "");

    res.send(html);
  } catch (error) {
    logger.error("Error generating page preview", {
      error: error,
      pageId: pageId,
    });
    res.status(500).send(`
      <html>
        <body>
          <h1>Preview Error</h1>
          <p>Unable to generate preview for this page.</p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

// POST route to save page metadata
router.post("/:id/metadata", async (req, res) => {
  const pageId = req.params.id;
  logger.info(`--- SAVE PAGE METADATA ${pageId} ---`);

  try {
    const { MetaTitle, MetaKeywords, MetaDescription, AlternativeUrls } =
      req.body;
    const pool = await db;

    // Check if metadata already exists for this page
    const existingResult = await pool
      .request()
      .input("PageID", sql.BigInt, pageId).query(`
        SELECT MetadataID FROM PageMetadata 
        WHERE PageID = @PageID
      `);

    const now = new Date();

    if (existingResult.recordset.length > 0) {
      // Update existing metadata
      await pool
        .request()
        .input("PageID", sql.BigInt, pageId)
        .input("MetaTitle", sql.NVarChar, MetaTitle || null)
        .input("MetaKeywords", sql.NVarChar, MetaKeywords || null)
        .input("MetaDescription", sql.NVarChar, MetaDescription || null)
        .input("LastUpdated", sql.DateTime2, now).query(`
          UPDATE PageMetadata 
          SET MetaTitle = @MetaTitle,
              MetaKeywords = @MetaKeywords,
              MetaDescription = @MetaDescription,
              LastUpdated = @LastUpdated
          WHERE PageID = @PageID
        `);
    } else {
      // Insert new metadata record
      await pool
        .request()
        .input("PageID", sql.BigInt, pageId)
        .input("MetaTitle", sql.NVarChar, MetaTitle || null)
        .input("MetaKeywords", sql.NVarChar, MetaKeywords || null)
        .input("MetaDescription", sql.NVarChar, MetaDescription || null)
        .input("LastUpdated", sql.DateTime2, now).query(`
          INSERT INTO PageMetadata (PageID, MetaTitle, MetaKeywords, MetaDescription, LastUpdated)
          VALUES (@PageID, @MetaTitle, @MetaKeywords, @MetaDescription, @LastUpdated)
        `);
    }

    // Handle alternative URLs
    if (Array.isArray(AlternativeUrls)) {
      // First, delete existing alternative URLs for this page
      await pool
        .request()
        .input("PageID", sql.BigInt, pageId)
        .query(`DELETE FROM AlternativeURLs WHERE PageID = @PageID`);

      // Insert new alternative URLs
      for (const url of AlternativeUrls) {
        if (url && url.trim()) {
          await pool
            .request()
            .input("PageID", sql.BigInt, pageId)
            .input("Path", sql.NVarChar, url.trim())
            .input("CreatedAt", sql.DateTime2, now).query(`
              INSERT INTO AlternativeURLs (PageID, Path, CreatedAt)
              VALUES (@PageID, @Path, @CreatedAt)
            `);
        }
      }
    }

    logger.info(`✅ Metadata saved successfully for page ${pageId}`);
    res.json({ success: true, message: "Metadata saved successfully" });
  } catch (error) {
    logger.error("Error saving page metadata", {
      error: error,
      pageId: pageId,
    });
    res.status(500).json({
      error: "Failed to save page metadata",
      details: error.message,
    });
  }
});

// GET route to load page metadata
router.get("/:id/metadata", async (req, res) => {
  const pageId = req.params.id;
  logger.info(`--- LOAD PAGE METADATA ${pageId} ---`);

  try {
    const pool = await db;

    // Get page metadata
    const metadataResult = await pool
      .request()
      .input("PageID", sql.BigInt, pageId).query(`
        SELECT MetaTitle, MetaDescription, MetaKeywords, CanonicalURL,
               OGTitle, OGDescription, OGImageURL
        FROM PageMetadata 
        WHERE PageID = @PageID
      `);

    // Get alternative URLs
    const alternativeUrlsResult = await pool
      .request()
      .input("PageID", sql.BigInt, pageId).query(`
        SELECT Path 
        FROM AlternativeURLs 
        WHERE PageID = @PageID
        ORDER BY CreatedAt
      `);

    const metadata =
      metadataResult.recordset.length > 0 ? metadataResult.recordset[0] : {};

    const alternativeUrls = alternativeUrlsResult.recordset.map(
      (row) => row.Path
    );

    const response = {
      ...metadata,
      AlternativeUrls: alternativeUrls,
    };

    logger.info(`✅ Metadata loaded successfully for page ${pageId}`);
    res.json(response);
  } catch (error) {
    logger.error("Error loading page metadata", {
      error: error,
      pageId: pageId,
    });
    res.status(500).json({
      error: "Failed to load page metadata",
      details: error.message,
    });
  }
});

module.exports = router;
