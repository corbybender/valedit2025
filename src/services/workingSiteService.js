const db = require("../config/database");
const sql = require("mssql");

// Ensure logger is available (it's set up globally in debug-logger.js)
const logger = global.logger || console;

logger.debug("=== workingSiteService.js loaded - REFACTORED VERSION ===");

const setCurrentWorkingSite = async (authorID, websiteID = null) => {
  try {
    logger.debug("Setting working site:", { authorID, websiteID });
    const pool = await db;
    const result = await pool
      .request()
      .input("AuthorID", sql.Int, authorID)
      .input("WebsiteID", sql.Int, websiteID)
      .query(
        `UPDATE [ValWebArchive].[dbo].[Authors] SET [CurrentWorkingSite] = @WebsiteID WHERE [AuthorID] = @AuthorID`
      );
    return result.rowsAffected[0] > 0;
  } catch (error) {
    logger.error("Error setting current working site", {
      error: error,
      authorID: authorID,
      websiteID: websiteID,
    });
    return false;
  }
};

const getCurrentWorkingSite = async (authorID) => {
  try {
    logger.debug("Getting working site for authorID:", authorID);
    if (!authorID) return null;

    const pool = await db;
    const result = await pool.request().input("AuthorID", sql.Int, authorID)
      .query(`
            SELECT 
                a.[AuthorID],
                a.[CurrentWorkingSite],
                w.[WebsiteID],
                w.[Domain] as WebsiteName,
                w.[Domain] as WebsiteURL
            FROM [ValWebArchive].[dbo].[Authors] a
            LEFT JOIN [ValWebArchive].[dbo].[Websites] w 
                ON a.[CurrentWorkingSite] = w.[WebsiteID]
            WHERE a.[AuthorID] = @AuthorID
        `);
    return result.recordset[0] || null;
  } catch (error) {
    logger.error("Error getting current working site", {
      error: error,
      authorID: authorID,
    });
    return null;
  }
};

const getAllUsersWorkingSites = async () => {
  try {
    const pool = await db;
    const result = await pool.request().query(`
            SELECT 
                a.[AuthorID],
                a.[AuthorName],
                a.[AuthorLogin],
                a.[CurrentWorkingSite],
                w.[Domain] as WebsiteName
            FROM [ValWebArchive].[dbo].[Authors] a
            LEFT JOIN [ValWebArchive].[dbo].[Websites] w 
                ON a.[CurrentWorkingSite] = w.[WebsiteID]
            ORDER BY a.[AuthorName]
        `);
    return result.recordset;
  } catch (error) {
    logger.error("Error getting all users working sites", { error: error });
    return [];
  }
};

module.exports = {
  setCurrentWorkingSite,
  getCurrentWorkingSite,
  getAllUsersWorkingSites,
};
