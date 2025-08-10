const db = require("./db");

async function checkWebsites() {
  try {
    const pool = await db;
    logger.info("Database connected successfully");

    // Get all websites
    const websites = await pool.query`SELECT WebsiteID, Domain FROM Websites`;

    logger.info("Existing websites:");
    console.table(websites.recordset);
  } catch (error) {
    console.error("Error checking websites:", error);
  }
}

checkWebsites();
