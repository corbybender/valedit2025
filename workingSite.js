const db = require("./db"); // Use the shared database pool
const sql = require("mssql"); // Use for data types like sql.Int

logger.debug("=== workingSite.js loaded - CORRECTED VERSION ===");

async function setCurrentWorkingSite(authorID, websiteID = null) {
  try {
    logger.debug("Setting working site:", { authorID, websiteID });
    const result = await db
      .request()
      .input("AuthorID", sql.Int, authorID)
      .input("WebsiteID", sql.Int, websiteID)
      .query(
        `UPDATE [ValWebArchive].[dbo].[Authors] SET [CurrentWorkingSite] = @WebsiteID WHERE [AuthorID] = @AuthorID`
      );
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error setting current working site:", error);
    return false;
  }
}

async function getCurrentWorkingSite(authorID) {
  try {
    logger.debug("Getting working site for authorID:", authorID);
    if (!authorID) return null;

    const result = await db.request().input("AuthorID", sql.Int, authorID)
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
    console.error("Error getting current working site:", error);
    return null;
  }
}

async function getAllUsersWorkingSites() {
  try {
    const result = await db.request().query(`
            SELECT 
                a.[AuthorID], a.[AuthorName], a.[AuthorLogin],
                a.[CurrentWorkingSite], w.[Domain] as WebsiteName,
                w.[Domain] as WebsiteURL, a.[LastLoginDate]
            FROM [ValWebArchive].[dbo].[Authors] a
            LEFT JOIN [ValWebArchive].[dbo].[Websites] w 
                ON a.[CurrentWorkingSite] = w.[WebsiteID]
            WHERE a.[IsActive] = 1
            ORDER BY a.[AuthorName]
        `);
    return result.recordset;
  } catch (error) {
    console.error("Error getting all users working sites:", error);
    return [];
  }
}

module.exports = {
  setCurrentWorkingSite,
  getCurrentWorkingSite,
  getAllUsersWorkingSites,
};
