// workingSite.js - Simple version without stored procedures
const { sql } = require("./db");

/**
 * Set the current working site for a user
 * @param {number} authorID - The author's ID
 * @param {number|null} websiteID - The website ID to set (null to clear)
 * @returns {Promise<boolean>} - Success status
 */
logger.info("=== workingSite.js loaded - NO STORED PROCEDURES VERSION ===");
async function setCurrentWorkingSite(authorID, websiteID = null) {
  try {
    logger.info("Setting working site:", { authorID, websiteID });
    const request = new sql.Request();
    request.input("AuthorID", sql.Int, authorID);
    request.input("WebsiteID", sql.Int, websiteID);

    const result = await request.query(`
            UPDATE [ValWebArchive].[dbo].[Authors]
            SET [CurrentWorkingSite] = @WebsiteID
            WHERE [AuthorID] = @AuthorID
        `);

    logger.info("Update result:", result.rowsAffected);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error setting current working site:", error);
    return false;
  }
}

/**
 * Get the current working site for a user
 * @param {number} authorID - The author's ID
 * @returns {Promise<object|null>} - Site information or null
 */
async function getCurrentWorkingSite(authorID) {
  try {
    logger.info("Getting working site for authorID:", authorID);
    const request = new sql.Request();
    request.input("AuthorID", sql.Int, authorID);

    // First check if the author exists and has CurrentWorkingSite field
    const authorCheck = await request.query(`
            SELECT AuthorID, AuthorName, CurrentWorkingSite 
            FROM [ValWebArchive].[dbo].[Authors] 
            WHERE AuthorID = @AuthorID
        `);

    logger.info("Author check result:", authorCheck.recordset);

    if (authorCheck.recordset.length === 0) {
      logger.info("Author not found");
      return null;
    }

    const result = await request.query(`
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

    logger.info("Full query result:", result.recordset);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error getting current working site:", error);
    return null;
  }
}

/**
 * Get current working site ID only
 * @param {number} authorID - The author's ID
 * @returns {Promise<number|null>} - Website ID or null
 */
async function getCurrentWorkingSiteID(authorID) {
  const site = await getCurrentWorkingSite(authorID);
  return site ? site.CurrentWorkingSite : null;
}

/**
 * Check if user has a current working site set
 * @param {number} authorID - The author's ID
 * @returns {Promise<boolean>} - True if site is set
 */
async function hasCurrentWorkingSite(authorID) {
  const siteID = await getCurrentWorkingSiteID(authorID);
  return siteID != null;
}

/**
 * Get all users and their current working sites (for admin)
 * @returns {Promise<Array>} - Array of user/site information
 */
async function getAllUsersWorkingSites() {
  try {
    const request = new sql.Request();
    const result = await request.query(`
            SELECT 
                a.[AuthorID],
                a.[AuthorName],
                a.[AuthorLogin],
                a.[CurrentWorkingSite],
                w.[Domain] as WebsiteName,
                w.[Domain] as WebsiteURL,
                a.[LastLoginDate]
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
  getCurrentWorkingSiteID,
  hasCurrentWorkingSite,
  getAllUsersWorkingSites,
};
