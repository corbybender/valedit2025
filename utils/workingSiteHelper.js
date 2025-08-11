// utils/workingSiteHelper.js
const db = require("../db"); // Use the shared database pool
const sql = require("mssql"); // Use mssql for data types like sql.Int
// const logger = require("./logger"); // logger is global

/**
 * Get all websites from database
 * @returns {Promise<Array>} - Array of websites
 */
async function getAllWebsites() {
  try {
    const result = await (await db).request().query(`
            SELECT WebsiteID, Domain as WebsiteName, Domain as WebsiteURL 
            FROM [ValWebArchive].[dbo].[Websites] 
            WHERE IsActive = 1
            ORDER BY Domain
        `);
    return result.recordset;
  } catch (error) {
    logger.error("Error getting websites", { error: error });
    return [];
  }
}

/**
 * Get a specific website by ID
 * @param {number} websiteID - The website ID
 * @returns {Promise<object|null>} - Website object or null
 */
async function getWebsiteById(websiteID) {
  try {
    const result = await (await db)
      .request()
      .input("WebsiteID", sql.Int, websiteID).query(`
            SELECT WebsiteID, Domain as WebsiteName, Domain as WebsiteURL 
            FROM [ValWebArchive].[dbo].[Websites] 
            WHERE WebsiteID = @WebsiteID AND IsActive = 1
        `);
    return result.recordset[0] || null;
  } catch (error) {
    logger.error("Error getting website by ID", {
      error: error,
      websiteID: websiteID,
    });
    return null;
  }
}

module.exports = {
  getAllWebsites,
  getWebsiteById,
};
