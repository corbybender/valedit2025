const db = require("../config/database");
const sql = require("mssql");
const SyncQueue = require("../../utils/syncQueue");
const logger = require("../../utils/logger");

const getAllPages = async (websiteId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("websiteId", sql.Int, websiteId)
      .query(`
        SELECT PageID, ParentPageID, Title, URL, Path, IsActive, DateCreated
        FROM Pages
        WHERE WebsiteID = @websiteId
        ORDER BY Title
      `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching pages:", error);
    throw error;
  }
};

const getPageById = async (pageId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("pageId", sql.Int, pageId).query(`
        SELECT p.*, w.Domain as WebsiteDomain
        FROM Pages p
        LEFT JOIN Websites w ON p.WebsiteID = w.WebsiteID
        WHERE p.PageID = @pageId
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching page by ID:", error);
    throw error;
  }
};

const createPage = async (pageData, authorId = null) => {
  try {
    const {
      websiteId,
      parentPageId,
      title,
      url,
      path,
      pageTemplateId,
      isActive = true,
    } = pageData;

    const pool = await db;
    const result = await pool
      .request()
      .input("websiteId", sql.Int, websiteId)
      .input("parentPageId", sql.Int, parentPageId)
      .input("title", sql.NVarChar, title)
      .input("url", sql.NVarChar, url)
      .input("path", sql.NVarChar, path)
      .input("pageTemplateId", sql.Int, pageTemplateId)
      .input("isActive", sql.Bit, isActive).query(`
        INSERT INTO Pages (
          WebsiteID, ParentPageID, Title, URL, Path, 
          PageTemplateID, IsActive, DateCreated
        )
        OUTPUT INSERTED.PageID
        VALUES (
          @websiteId, @parentPageId, @title, @url, @path,
          @pageTemplateId, @isActive, GETDATE()
        )
      `);

    const newPage = result.recordset[0];

    // Queue page sync for creation
    if (authorId) {
      try {
        await SyncQueue.queuePageSync(
          newPage.PageID,
          websiteId,
          "CREATE",
          authorId,
          `Page created via service: ${title}`
        );
        logger.info(`✅ Queued page sync for page creation: ${newPage.PageID}`);
      } catch (syncError) {
        logger.error("Failed to queue page sync for page creation", {
          error: syncError,
          pageId: newPage.PageID,
        });
      }
    }

    return newPage;
  } catch (error) {
    console.error("Error creating page:", error);
    throw error;
  }
};

const updatePage = async (pageId, pageData, authorId = null) => {
  try {
    const { parentPageId, title, url, path, pageTemplateId, isActive } =
      pageData;

    // Get website ID before update for sync queue
    let websiteId = null;
    if (authorId) {
      try {
        const pool = await db;
        const pageResult = await pool
          .request()
          .input("pageId", sql.Int, pageId)
          .query("SELECT WebsiteID FROM Pages WHERE PageID = @pageId");

        if (pageResult.recordset.length > 0) {
          websiteId = pageResult.recordset[0].WebsiteID;
        }
      } catch (syncError) {
        logger.error("Failed to get website ID for sync queue", {
          error: syncError,
          pageId: pageId,
        });
      }
    }

    const pool = await db;
    const result = await pool
      .request()
      .input("pageId", sql.Int, pageId)
      .input("parentPageId", sql.Int, parentPageId)
      .input("title", sql.NVarChar, title)
      .input("url", sql.NVarChar, url)
      .input("path", sql.NVarChar, path)
      .input("pageTemplateId", sql.Int, pageTemplateId)
      .input("isActive", sql.Bit, isActive).query(`
        UPDATE Pages
        SET ParentPageID = @parentPageId,
            Title = @title,
            URL = @url,
            Path = @path,
            PageTemplateID = @pageTemplateId,
            IsActive = @isActive
        WHERE PageID = @pageId
      `);

    const success = result.rowsAffected[0] > 0;

    // Queue page sync for update
    if (success && authorId && websiteId) {
      try {
        await SyncQueue.queuePageSync(
          pageId,
          websiteId,
          "UPDATE",
          authorId,
          `Page updated via service: ${title}`
        );
        logger.info(`✅ Queued page sync for page update: ${pageId}`);
      } catch (syncError) {
        logger.error("Failed to queue page sync for page update", {
          error: syncError,
          pageId: pageId,
        });
      }
    }

    return success;
  } catch (error) {
    console.error("Error updating page:", error);
    throw error;
  }
};

const deletePage = async (pageId, authorId = null) => {
  try {
    // Get website ID before deletion for sync queue
    let websiteId = null;
    if (authorId) {
      try {
        const pool = await db;
        const pageResult = await pool
          .request()
          .input("pageId", sql.Int, pageId)
          .query("SELECT WebsiteID, Title FROM Pages WHERE PageID = @pageId");

        if (pageResult.recordset.length > 0) {
          websiteId = pageResult.recordset[0].WebsiteID;
        }
      } catch (syncError) {
        logger.error("Failed to get website ID for sync queue", {
          error: syncError,
          pageId: pageId,
        });
      }
    }

    const pool = await db;
    const result = await pool.request().input("pageId", sql.Int, pageId).query(`
        DELETE FROM Pages
        WHERE PageID = @pageId
      `);

    const success = result.rowsAffected[0] > 0;

    // Queue page sync for deletion
    if (success && authorId && websiteId) {
      try {
        await SyncQueue.queuePageSync(
          pageId,
          websiteId,
          "DELETE",
          authorId,
          `Page deleted via service`
        );
        logger.info(`✅ Queued page sync for page deletion: ${pageId}`);
      } catch (syncError) {
        logger.error("Failed to queue page sync for page deletion", {
          error: syncError,
          pageId: pageId,
        });
      }
    }

    return success;
  } catch (error) {
    console.error("Error deleting page:", error);
    throw error;
  }
};

const buildPageTree = (pages) => {
  const pageMap = new Map();
  const pageTree = [];

  // Create a map of all pages
  pages.forEach((page) => {
    pageMap.set(page.PageID, { ...page, children: [] });
  });

  // Build the tree structure
  for (const page of pageMap.values()) {
    if (page.ParentPageID && pageMap.has(page.ParentPageID)) {
      pageMap.get(page.ParentPageID).children.push(page);
    } else {
      pageTree.push(page);
    }
  }

  return pageTree;
};

module.exports = {
  getAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  buildPageTree,
};
