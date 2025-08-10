const db = require("./db");

async function checkSharedContentTable() {
  try {
    await db.connect();
    logger.info("Database connected successfully");

    // Check if SharedContent table exists
    const tableCheck = await db.query`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'SharedContent'
    `;

    if (tableCheck.recordset.length > 0) {
      logger.info("SharedContent table exists");

      // Get table structure
      const structure = await db.query`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SharedContent'
        ORDER BY ORDINAL_POSITION
      `;

      logger.info("SharedContent table structure:");
      console.table(structure.recordset);
    } else {
      logger.info("SharedContent table does not exist");
    }

    // Close connection
    await db.close();
  } catch (error) {
    console.error("Error checking SharedContent table:", error);
  }
}

checkSharedContentTable();
